import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { badRequest, clampNumber, clampString, notFound, parseId, readNumber, serverError } from "@/lib/api";
import { avatarKey, getBucket } from "@/lib/r2";
import { isValidYmd } from "@/lib/time";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function deletePrefix(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  let guard = 0;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    if (page.objects.length) await bucket.delete(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor && ++guard < 200);
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(children).where(eq(children.id, id)).get();
    if (!row) return notFound();

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<typeof children.$inferInsert> = {};

    if (p.name !== undefined) {
      const name = clampString(p.name, 40);
      if (!name) return badRequest("名字不能为空");
      patch.name = name;
    }
    if (p.nickname !== undefined) patch.nickname = clampString(p.nickname, 40);
    if (p.birthDate !== undefined) {
      const v = clampString(p.birthDate, 10);
      if (!isValidYmd(v)) return badRequest("出生日期格式不对");
      patch.birthDate = v;
    }
    if (p.birthTime !== undefined) patch.birthTime = clampString(p.birthTime, 5);
    if (p.sex !== undefined && ["boy", "girl", "unknown"].includes(String(p.sex))) patch.sex = String(p.sex);
    if (p.bio !== undefined) patch.bio = clampString(p.bio, 500);
    if (p.birthWeightKg !== undefined) {
      const r = readNumber(p.birthWeightKg, 0.5, 20, "出生体重");
      if (r.error) return badRequest(r.error);
      patch.birthWeightKg = r.value;
    }
    if (p.birthHeightCm !== undefined) {
      const r = readNumber(p.birthHeightCm, 20, 70, "出生身长");
      if (r.error) return badRequest(r.error);
      patch.birthHeightCm = r.value;
    }
    if (p.sortOrder !== undefined) patch.sortOrder = clampNumber(p.sortOrder, 0, 999) ?? 0;

    // 头像：客户端已经流式传到 a/{id}/{uploadId}.jpg，这里确认存在再落库
    if (p.avatarUploadId !== undefined) {
      const uploadId = clampString(p.avatarUploadId, 64);
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(uploadId)) return badRequest("avatarUploadId 不合法");
      const key = avatarKey(id, uploadId);
      const stored = await getBucket().head(key);
      if (!stored) return badRequest("头像还没传完");
      const old = row.avatarKey;
      patch.avatarKey = key;
      if (old && old !== key) void getBucket().delete(old).catch(() => {});
    }
    if (p.avatarKey === null) {
      const old = row.avatarKey;
      patch.avatarKey = null;
      if (old) void getBucket().delete(old).catch(() => {});
    }

    if (!Object.keys(patch).length) return Response.json({ child: row });
    const [updated] = await db.update(children).set(patch).where(eq(children.id, id)).returning();
    return Response.json({ child: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(children).where(eq(children.id, id)).get();
    if (!row) return notFound();

    // 外键是 ON DELETE CASCADE，记录会自动清掉；R2 里的文件要自己删
    await db.delete(children).where(eq(children.id, id));
    const bucket = getBucket();
    await Promise.allSettled([
      deletePrefix(bucket, `m/${id}/`),
      deletePrefix(bucket, `t/${id}/`),
      deletePrefix(bucket, `a/${id}/`),
    ]);

    return Response.json({ ok: true, id });
  } catch (error) {
    return serverError(error);
  }
}
