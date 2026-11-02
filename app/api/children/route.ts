import { denyIfAnonymous } from "@/lib/platform/guard";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { badRequest, clampString, readNumber, serverError } from "@/lib/api";
import { isValidYmd } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const rows = await getDb()
      .select()
      .from(children)
      .orderBy(asc(children.sortOrder), asc(children.id))
      .all();
    return Response.json({ children: rows });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = clampString(p.name, 40);
    const birthDate = clampString(p.birthDate, 10);
    if (!name) return badRequest("给宝宝起个名字或昵称吧");
    if (!isValidYmd(birthDate)) return badRequest("请填写正确的出生日期");

    const bw = readNumber(p.birthWeightKg, 0.5, 20, "出生体重");
    const bh = readNumber(p.birthHeightCm, 20, 70, "出生身长");
    if (bw.error) return badRequest(bw.error);
    if (bh.error) return badRequest(bh.error);

    const db = getDb();
    const orderRow = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${children.sortOrder}), 0)` })
      .from(children)
      .get();
    const maxOrder = Number(orderRow?.maxOrder ?? 0);

    const sex = ["boy", "girl"].includes(String(p.sex)) ? String(p.sex) : "unknown";
    const [row] = await db
      .insert(children)
      .values({
        name,
        nickname: clampString(p.nickname, 40),
        birthDate,
        birthTime: clampString(p.birthTime, 5),
        sex,
        bio: clampString(p.bio, 500),
        birthWeightKg: bw.value,
        birthHeightCm: bh.value,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return Response.json({ child: row }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
