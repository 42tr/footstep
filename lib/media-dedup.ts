import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { media, type MediaRow } from "@/db/schema";
import { getStorage } from "@/lib/platform/storage";
import { sha256Stream } from "@/lib/content-hash";
import { imageHashStream } from "@/lib/image-hash";

const CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/;

export function readContentHash(value: unknown): string | null {
  const hash = String(value ?? "").trim().toLowerCase();
  return CONTENT_HASH_PATTERN.test(hash) ? hash : null;
}

export function findMediaByContentHash(childId: number, contentHash: string): Promise<MediaRow | undefined> {
  return getDb()
    .select()
    .from(media)
    .where(and(eq(media.childId, childId), eq(media.contentHash, contentHash)))
    .orderBy(media.id)
    .limit(1)
    .get();
}

export function findMediaByImageHash(childId: number, imageHash: string): Promise<MediaRow | undefined> {
  return getDb()
    .select()
    .from(media)
    .where(and(eq(media.childId, childId), eq(media.imageHash, imageHash)))
    .orderBy(media.id)
    .limit(1)
    .get();
}

/**
 * 先查索引；旧媒体没有哈希时，只读取大小相同的候选并补算。
 * 唯一索引可能拒绝重复旧记录的补写，这不影响返回已索引的那一条。
 */
export async function findDuplicateMedia(
  childId: number,
  contentHash: string,
  bytes: number,
  imageHash?: string,
): Promise<MediaRow | undefined> {
  const indexed = await findMediaByContentHash(childId, contentHash);
  if (indexed) return indexed;

  const db = getDb();
  const candidates = await db
    .select()
    .from(media)
    .where(and(eq(media.childId, childId), eq(media.bytes, bytes), isNull(media.contentHash)))
    .orderBy(media.id)
    .all();

  for (const candidate of candidates) {
    try {
      const stored = await getStorage().get(candidate.fileKey);
      if (!stored?.body) continue;
      const digest = await sha256Stream(stored.body);
      try {
        await db
          .update(media)
          .set({ contentHash: digest })
          .where(and(eq(media.id, candidate.id), isNull(media.contentHash)))
          .run();
      } catch {
        // 另一条相同的旧记录已经写入这个哈希，沿用已索引记录即可。
      }
      if (digest === contentHash) {
        return (await findMediaByContentHash(childId, contentHash)) ?? candidate;
      }
    } catch {
      // 单个旧文件缺失或不可读，不应阻止其他媒体继续上传。
    }
  }
  if (imageHash) {
    const indexedImage = await findMediaByImageHash(childId, imageHash);
    if (indexedImage) return indexedImage;

    // 旧照片可能已有文件哈希，但没有像素哈希，因此不能只查相同文件大小。
    const imageCandidates = await db
      .select()
      .from(media)
      .where(and(eq(media.childId, childId), eq(media.kind, "photo"), isNull(media.imageHash)))
      .orderBy(media.id)
      .all();

    for (const candidate of imageCandidates) {
      try {
        const stored = await getStorage().get(candidate.fileKey);
        if (!stored?.body) continue;
        const digest = await imageHashStream(stored.body);
        if (!digest) continue;
        try {
          await db
            .update(media)
            .set({ imageHash: digest })
            .where(and(eq(media.id, candidate.id), isNull(media.imageHash)))
            .run();
        } catch {
          // 重复旧记录可能无法补写唯一索引，已索引的记录仍可用于查重。
        }
        if (digest === imageHash) {
          return (await findMediaByImageHash(childId, imageHash)) ?? candidate;
        }
      } catch {
        // 单张旧照片无法解码时，继续检查其他照片。
      }
    }
  }

  return undefined;
}
