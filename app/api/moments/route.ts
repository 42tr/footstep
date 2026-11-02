import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children, moments } from "@/db/schema";
import { badRequest, clampString, serverError } from "@/lib/api";
import { parseMediaIds } from "@/lib/data";
import { MOMENT_CATEGORIES } from "@/lib/firsts";
import { getActor } from "@/lib/identity";
import { isValidYmd, todayYmd } from "@/lib/time";

export const dynamic = "force-dynamic";

const VALID = new Set<string>(MOMENT_CATEGORIES.map((c) => c.key));

export async function GET(request: Request) {
  try {
    const childId = Number(new URL(request.url).searchParams.get("childId"));
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    const rows = await getDb()
      .select()
      .from(moments)
      .where(eq(moments.childId, childId))
      .orderBy(desc(moments.happenedOn), desc(moments.id))
      .limit(500)
      .all();
    return Response.json({ moments: rows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const childId = Number(p.childId);
    const title = clampString(p.title, 120);
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    if (!title) return badRequest("给这一刻起个标题吧");

    const happenedRaw = clampString(p.happenedOn, 10) || todayYmd();
    if (!isValidYmd(happenedRaw)) return badRequest("日期格式应该是 YYYY-MM-DD");
    const category = VALID.has(String(p.category)) ? String(p.category) : "daily";

    const db = getDb();
    const child = await db.select({ id: children.id }).from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    const actor = await getActor();
    const [row] = await db
      .insert(moments)
      .values({
        childId,
        happenedOn: happenedRaw,
        title,
        body: clampString(p.body, 4000),
        category,
        mediaIds: JSON.stringify(parseMediaIds(JSON.stringify(p.mediaIds ?? [])).slice(0, 20)),
        createdBy: actor.label,
      })
      .returning();

    return Response.json({ moment: row }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
