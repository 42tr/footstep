import { denyIfAnonymous } from "@/lib/platform/guard";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children, media, type MediaRow } from "@/db/schema";
import { badRequest, clampNumber, clampString, serverError } from "@/lib/api";
import { getActor } from "@/lib/identity";
import { findMediaByContentHash, readContentHash } from "@/lib/media-dedup";
import { mediaKey, thumbKey } from "@/lib/r2";
import { getStorage } from "@/lib/platform/storage";
import { isValidYmd, todayYmd } from "@/lib/time";
import { serializeMedia } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const childId = Number(url.searchParams.get("childId"));
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    const db = getDb();
    const rows = await db
      .select()
      .from(media)
      .where(eq(media.childId, childId))
      .orderBy(desc(media.takenAt), desc(media.id))
      .limit(800)
      .all();
    return Response.json({ media: rows.map(serializeMedia) });
  } catch (error) {
    return serverError(error);
  }
}

/** 文件已经流式传到对象存储，这里只落库元数据。 */
export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const childId = Number(payload.childId);
    const uploadId = clampString(payload.uploadId, 64);
    const kind = payload.kind === "video" ? "video" : "photo";
    const contentHash = readContentHash(payload.contentHash);

    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(uploadId)) return badRequest("uploadId 不合法");
    if (!contentHash) return badRequest("文件内容摘要缺失，请刷新页面后重试");

    const db = getDb();
    const child = await db.select({ id: children.id }).from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    const storage = getStorage();
    const fileKey = mediaKey(childId, uploadId);
    const stored = await storage.head(fileKey);
    if (!stored) return badRequest("文件还没传完，先上传再保存");

    const tKey = thumbKey(childId, uploadId);
    const thumb = await storage.head(tKey);

    const takenAtRaw = clampString(payload.takenAt, 10);
    const takenAt = isValidYmd(takenAtRaw) ? takenAtRaw : todayYmd();
    const actor = await getActor();

    let row: MediaRow | undefined;
    try {
      [row] = await db
        .insert(media)
        .values({
          childId,
          kind,
          fileKey,
          thumbKey: thumb ? tKey : null,
          mime: clampString(payload.mime, 120) || stored.contentType || "",
          bytes: stored.size,
          contentHash,
          width: clampNumber(payload.width, 1, 20000),
          height: clampNumber(payload.height, 1, 20000),
          durationMs: kind === "video" ? clampNumber(payload.durationMs, 0, 86400000) : null,
          takenAt,
          caption: clampString(payload.caption, 500),
          album: clampString(payload.album, 60),
          favorite: payload.favorite === true,
          uploadedBy: actor.label,
        })
        .returning();
    } catch (error) {
      // 两个相同文件同时通过上传前检查时，由唯一索引保证只保留一条记录。
      const duplicate = await findMediaByContentHash(childId, contentHash);
      if (!duplicate) throw error;
      await Promise.allSettled([storage.delete(fileKey), storage.delete(tKey)]);
      return Response.json({ error: "这个文件已经存在，不会重复保存", media: serializeMedia(duplicate) }, { status: 409 });
    }

    if (!row) throw new Error("媒体记录保存失败");
    return Response.json({ media: serializeMedia(row) }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
