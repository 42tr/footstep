import { asc, and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children, firsts } from "@/db/schema";
import { badRequest, clampString, serverError } from "@/lib/api";
import { getActor } from "@/lib/identity";
import { PRESET_MAP } from "@/lib/firsts";
import { daysBetween, isValidYmd, todayYmd } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const childId = Number(new URL(request.url).searchParams.get("childId"));
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    const rows = await getDb()
      .select()
      .from(firsts)
      .where(eq(firsts.childId, childId))
      .orderBy(asc(firsts.achievedOn), desc(firsts.id))
      .all();
    return Response.json({ firsts: rows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const childId = Number(p.childId);
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");

    const presetKey = clampString(p.presetKey, 60);
    const preset = presetKey ? PRESET_MAP[presetKey] : undefined;
    const label = preset ? preset.label : clampString(p.label, 60);
    if (!label) return badRequest("要给这个「第一次」起个名字");
    const emoji = clampString(p.emoji, 16) || preset?.emoji || "🌟";

    const achievedRaw = clampString(p.achievedOn, 10) || todayYmd();
    if (!isValidYmd(achievedRaw)) return badRequest("日期格式应该是 YYYY-MM-DD");

    const db = getDb();
    const child = await db.select().from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    if (preset) {
      const dup = await db
        .select({ id: firsts.id })
        .from(firsts)
        .where(and(eq(firsts.childId, childId), eq(firsts.presetKey, presetKey)))
        .get();
      if (dup) return badRequest(`「${preset.label}」已经打过卡了，可以直接编辑它`);
    }

    const actor = await getActor();
    const mediaId = Number(p.mediaId);
    const [row] = await db
      .insert(firsts)
      .values({
        childId,
        presetKey: preset ? presetKey : "",
        label,
        emoji,
        achievedOn: achievedRaw,
        ageDays: daysBetween(child.birthDate, achievedRaw),
        note: clampString(p.note, 500),
        mediaId: Number.isInteger(mediaId) && mediaId > 0 ? mediaId : null,
        createdBy: actor.label,
      })
      .returning();

    return Response.json({ first: row }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
