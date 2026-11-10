import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { media, type MediaRow } from "@/db/schema";
import { getStorage } from "@/lib/platform/storage";

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

async function sha256(body: ReadableStream<Uint8Array>): Promise<string> {
  // 只有旧记录与新文件大小一致时才会走到这里，避免为了查重读取整个相册。
  const bytes = await new Response(body).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * 先查索引；旧媒体没有哈希时，只读取大小相同的候选并补算。
 * 唯一索引可能拒绝重复旧记录的补写，这不影响返回已索引的那一条。
 */
export async function findDuplicateMedia(
  childId: number,
  contentHash: string,
  bytes: number,
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
      const digest = await sha256(stored.body);
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
  return undefined;
}
