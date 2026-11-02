import { denyIfAnonymous } from "@/lib/platform/guard";
import { eq, like } from "drizzle-orm";
import { getDb } from "@/db";
import { media, moments } from "@/db/schema";
import { badRequest, clampString, notFound, parseId, serverError } from "@/lib/api";
import { getStorage } from "@/lib/platform/storage";
import { isValidYmd } from "@/lib/time";
import { parseMediaIds } from "@/lib/data";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");

    const db = getDb();
    const row = await db.select().from(media).where(eq(media.id, id)).get();
    if (!row) return notFound();

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<typeof media.$inferInsert> = {};

    if (payload.caption !== undefined) patch.caption = clampString(payload.caption, 500);
    if (payload.album !== undefined) patch.album = clampString(payload.album, 60);
    if (payload.favorite !== undefined) patch.favorite = payload.favorite === true;
    if (payload.takenAt !== undefined) {
      const v = clampString(payload.takenAt, 10);
      if (!isValidYmd(v)) return badRequest("日期格式应该是 YYYY-MM-DD");
      patch.takenAt = v;
    }

    if (!Object.keys(patch).length) return Response.json({ media: row });
    const [updated] = await db.update(media).set(patch).where(eq(media.id, id)).returning();
    return Response.json({ media: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");

    const db = getDb();
    const row = await db.select().from(media).where(eq(media.id, id)).get();
    if (!row) return notFound();

    // 先把它从时间线记录的引用里摘掉，避免留下死链
    const touched = await db
      .select()
      .from(moments)
      .where(like(moments.mediaIds, `%${id}%`))
      .all();
    for (const moment of touched) {
      const ids = parseMediaIds(moment.mediaIds).filter((x) => x !== id);
      if (ids.length !== parseMediaIds(moment.mediaIds).length) {
        await db.update(moments).set({ mediaIds: JSON.stringify(ids) }).where(eq(moments.id, moment.id));
      }
    }

    await db.delete(media).where(eq(media.id, id));

    const storage = getStorage();
    await Promise.allSettled([storage.delete(row.fileKey), row.thumbKey ? storage.delete(row.thumbKey) : Promise.resolve()]);

    return Response.json({ ok: true, id });
  } catch (error) {
    return serverError(error);
  }
}
