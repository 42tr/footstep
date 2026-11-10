import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { badRequest, serverError } from "@/lib/api";
import { findDuplicateMedia, readContentHash } from "@/lib/media-dedup";
import { denyIfAnonymous } from "@/lib/platform/guard";
import { serializeMedia } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const childId = Number(payload.childId);
    const bytes = Number(payload.bytes);
    const contentHash = readContentHash(payload.contentHash);
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    if (!Number.isSafeInteger(bytes) || bytes <= 0) return badRequest("文件大小不合法");
    if (!contentHash) return badRequest("文件内容摘要缺失");

    const child = await getDb().select({ id: children.id }).from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    const duplicate = await findDuplicateMedia(childId, contentHash, bytes);
    return Response.json({ media: duplicate ? serializeMedia(duplicate) : null });
  } catch (error) {
    return serverError(error);
  }
}
