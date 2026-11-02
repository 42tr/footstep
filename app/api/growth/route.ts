import { denyIfAnonymous } from "@/lib/platform/guard";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children, growth } from "@/db/schema";
import { badRequest, clampString, readNumber, serverError } from "@/lib/api";
import { getActor } from "@/lib/identity";
import { isValidYmd, todayYmd } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const childId = Number(new URL(request.url).searchParams.get("childId"));
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    const rows = await getDb()
      .select()
      .from(growth)
      .where(eq(growth.childId, childId))
      .orderBy(asc(growth.recordedOn), asc(growth.id))
      .all();
    return Response.json({ growth: rows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const childId = Number(p.childId);
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");

    const height = readNumber(p.heightCm, 20, 250, "身高");
    const weight = readNumber(p.weightKg, 0.5, 200, "体重");
    const head = readNumber(p.headCm, 20, 70, "头围");
    const rangeError = height.error ?? weight.error ?? head.error;
    if (rangeError) return badRequest(rangeError);
    if (height.value === null && weight.value === null && head.value === null) {
      return badRequest("身高、体重、头围至少要填一项");
    }

    const recordedRaw = clampString(p.recordedOn, 10) || todayYmd();
    if (!isValidYmd(recordedRaw)) return badRequest("日期格式应该是 YYYY-MM-DD");

    const db = getDb();
    const child = await db.select({ id: children.id }).from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    const actor = await getActor();
    const [row] = await db
      .insert(growth)
      .values({
        childId,
        recordedOn: recordedRaw,
        heightCm: height.value,
        weightKg: weight.value,
        headCm: head.value,
        note: clampString(p.note, 300),
        createdBy: actor.label,
      })
      .returning();

    return Response.json({ growth: row }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
