import { denyIfAnonymous } from "@/lib/platform/guard";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { moments } from "@/db/schema";
import { badRequest, clampString, notFound, parseId, serverError } from "@/lib/api";
import { parseMediaIds } from "@/lib/data";
import { MOMENT_CATEGORIES } from "@/lib/firsts";
import { isValidYmd } from "@/lib/time";

export const dynamic = "force-dynamic";
const VALID = new Set<string>(MOMENT_CATEGORIES.map((c) => c.key));
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(moments).where(eq(moments.id, id)).get();
    if (!row) return notFound();

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<typeof moments.$inferInsert> = {};
    if (p.title !== undefined) {
      const title = clampString(p.title, 120);
      if (!title) return badRequest("标题不能为空");
      patch.title = title;
    }
    if (p.body !== undefined) patch.body = clampString(p.body, 4000);
    if (p.category !== undefined && VALID.has(String(p.category))) patch.category = String(p.category);
    if (p.happenedOn !== undefined) {
      const v = clampString(p.happenedOn, 10);
      if (!isValidYmd(v)) return badRequest("日期格式应该是 YYYY-MM-DD");
      patch.happenedOn = v;
    }
    if (p.mediaIds !== undefined) {
      patch.mediaIds = JSON.stringify(parseMediaIds(JSON.stringify(p.mediaIds ?? [])).slice(0, 20));
    }

    if (!Object.keys(patch).length) return Response.json({ moment: row });
    const [updated] = await db.update(moments).set(patch).where(eq(moments.id, id)).returning();
    return Response.json({ moment: updated });
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
    const row = await db.select().from(moments).where(eq(moments.id, id)).get();
    if (!row) return notFound();
    await db.delete(moments).where(eq(moments.id, id));
    return Response.json({ ok: true, id });
  } catch (error) {
    return serverError(error);
  }
}
