import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children, firsts } from "@/db/schema";
import { badRequest, clampString, notFound, parseId, serverError } from "@/lib/api";
import { daysBetween, isValidYmd } from "@/lib/time";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(firsts).where(eq(firsts.id, id)).get();
    if (!row) return notFound();

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<typeof firsts.$inferInsert> = {};

    if (p.label !== undefined && !row.presetKey) {
      const label = clampString(p.label, 60);
      if (!label) return badRequest("名字不能为空");
      patch.label = label;
    }
    if (p.emoji !== undefined && !row.presetKey) patch.emoji = clampString(p.emoji, 16) || "🌟";
    if (p.note !== undefined) patch.note = clampString(p.note, 500);
    if (p.mediaId !== undefined) {
      const mediaId = Number(p.mediaId);
      patch.mediaId = Number.isInteger(mediaId) && mediaId > 0 ? mediaId : null;
    }
    if (p.achievedOn !== undefined) {
      const v = clampString(p.achievedOn, 10);
      if (!isValidYmd(v)) return badRequest("日期格式应该是 YYYY-MM-DD");
      const child = await db.select().from(children).where(eq(children.id, row.childId)).get();
      patch.achievedOn = v;
      patch.ageDays = child ? daysBetween(child.birthDate, v) : null;
    }

    if (!Object.keys(patch).length) return Response.json({ first: row });
    const [updated] = await db.update(firsts).set(patch).where(eq(firsts.id, id)).returning();
    return Response.json({ first: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(firsts).where(eq(firsts.id, id)).get();
    if (!row) return notFound();
    await db.delete(firsts).where(eq(firsts.id, id));
    return Response.json({ ok: true, id });
  } catch (error) {
    return serverError(error);
  }
}
