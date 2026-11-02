import { denyIfAnonymous } from "@/lib/platform/guard";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { growth } from "@/db/schema";
import { badRequest, clampString, notFound, parseId, readNumber, serverError } from "@/lib/api";
import { isValidYmd } from "@/lib/time";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const id = parseId((await ctx.params).id);
    if (!id) return badRequest("id 不合法");
    const db = getDb();
    const row = await db.select().from(growth).where(eq(growth.id, id)).get();
    if (!row) return notFound();

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Partial<typeof growth.$inferInsert> = {};
    if (p.heightCm !== undefined) {
      const r = readNumber(p.heightCm, 20, 250, "身高");
      if (r.error) return badRequest(r.error);
      patch.heightCm = r.value;
    }
    if (p.weightKg !== undefined) {
      const r = readNumber(p.weightKg, 0.5, 200, "体重");
      if (r.error) return badRequest(r.error);
      patch.weightKg = r.value;
    }
    if (p.headCm !== undefined) {
      const r = readNumber(p.headCm, 20, 70, "头围");
      if (r.error) return badRequest(r.error);
      patch.headCm = r.value;
    }
    if (p.note !== undefined) patch.note = clampString(p.note, 300);
    if (p.recordedOn !== undefined) {
      const v = clampString(p.recordedOn, 10);
      if (!isValidYmd(v)) return badRequest("日期格式应该是 YYYY-MM-DD");
      patch.recordedOn = v;
    }
    if (!Object.keys(patch).length) return Response.json({ growth: row });
    const [updated] = await db.update(growth).set(patch).where(eq(growth.id, id)).returning();
    return Response.json({ growth: updated });
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
    const row = await db.select().from(growth).where(eq(growth.id, id)).get();
    if (!row) return notFound();
    await db.delete(growth).where(eq(growth.id, id));
    return Response.json({ ok: true, id });
  } catch (error) {
    return serverError(error);
  }
}
