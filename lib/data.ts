import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  children,
  firsts,
  growth,
  media,
  members,
  moments,
  type ChildRow,
  type FirstRow,
  type GrowthRow,
  type MediaRow,
  type MomentRow,
} from "@/db/schema";
import { computeAge, todayYmd, type Age } from "@/lib/time";

export type ChildWithAge = ChildRow & { age: Age | null; ageDays: number };

export async function listChildren(): Promise<ChildWithAge[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(children)
    .orderBy(asc(children.sortOrder), asc(children.id))
    .all();
  const today = todayYmd();
  return rows.map((row) => ({
    ...row,
    age: computeAge(row.birthDate, today),
    ageDays: computeAge(row.birthDate, today)?.totalDays ?? 0,
  }));
}

export async function getChild(childId: number): Promise<ChildWithAge | null> {
  const db = getDb();
  const row = await db.select().from(children).where(eq(children.id, childId)).get();
  if (!row) return null;
  const age = computeAge(row.birthDate, todayYmd());
  return { ...row, age, ageDays: age?.totalDays ?? 0 };
}

export async function listMedia(childId: number, limit = 400): Promise<MediaRow[]> {
  const db = getDb();
  return db
    .select()
    .from(media)
    .where(eq(media.childId, childId))
    .orderBy(desc(media.takenAt), desc(media.id))
    .limit(limit)
    .all();
}

export async function listMoments(childId: number, limit = 300): Promise<MomentRow[]> {
  const db = getDb();
  return db
    .select()
    .from(moments)
    .where(eq(moments.childId, childId))
    .orderBy(desc(moments.happenedOn), desc(moments.id))
    .limit(limit)
    .all();
}

export async function listGrowth(childId: number): Promise<GrowthRow[]> {
  const db = getDb();
  return db
    .select()
    .from(growth)
    .where(eq(growth.childId, childId))
    .orderBy(asc(growth.recordedOn), asc(growth.id))
    .all();
}

export async function listFirsts(childId: number): Promise<FirstRow[]> {
  const db = getDb();
  return db
    .select()
    .from(firsts)
    .where(eq(firsts.childId, childId))
    .orderBy(asc(firsts.achievedOn), desc(firsts.id))
    .all();
}

export async function listMembers() {
  const db = getDb();
  return db.select().from(members).all();
}

/** 把 moment 里引用的 mediaIds 解析出来，并批量取回对应媒体。 */
export async function mediaByIds(ids: number[]): Promise<Record<number, MediaRow>> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  if (!unique.length) return {};
  const db = getDb();
  const rows = await db.select().from(media).where(inArray(media.id, unique)).all();
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

export function parseMediaIds(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export type Stats = {
  photos: number;
  videos: number;
  moments: number;
  firstsDone: number;
  growthRecords: number;
  latestHeightCm: number | null;
  latestWeightKg: number | null;
};

export async function childStats(childId: number): Promise<Stats> {
  const [allMedia, allMoments, allFirsts, allGrowth] = await Promise.all([
    listMedia(childId, 2000),
    listMoments(childId, 1000),
    listFirsts(childId),
    listGrowth(childId),
  ]);
  const last = allGrowth[allGrowth.length - 1];
  return {
    photos: allMedia.filter((m) => m.kind === "photo").length,
    videos: allMedia.filter((m) => m.kind === "video").length,
    moments: allMoments.length,
    firstsDone: allFirsts.filter((f) => f.achievedOn).length,
    growthRecords: allGrowth.length,
    latestHeightCm: last?.heightCm ?? null,
    latestWeightKg: last?.weightKg ?? null,
  };
}
