import { denyIfAnonymous } from "@/lib/platform/guard";
import { eq } from "drizzle-orm";
import { badRequest, serverError } from "@/lib/api";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { avatarKey, MAX_UPLOAD_BYTES, mediaKey, thumbKey } from "@/lib/r2";
import { getStorage } from "@/lib/platform/storage";
import { sha256Stream } from "@/lib/content-hash";
import { findDuplicateMedia } from "@/lib/media-dedup";
import { serializeMedia } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * 流式直传：请求体原样交给 R2，不在 Worker 内存里缓冲整个文件，
 * 这样几百 MB 的视频也不会撑爆 128MB 的 isolate。
 */
export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") ?? "";
    const childId = Number(url.searchParams.get("childId"));
    const uploadId = url.searchParams.get("uploadId") ?? crypto.randomUUID();

    if (!["m", "t", "a"].includes(scope)) return badRequest("scope 必须是 m / t / a");
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");
    if (!SAFE_ID.test(uploadId)) return badRequest("uploadId 不合法");

    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES) {
      return badRequest(
        `文件太大了（上限 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB）。视频可以先压缩一下，或者挑一段再传。`,
      );
    }
    if (!request.body) return badRequest("请求体是空的");

    const db = getDb();
    const child = await db.select({ id: children.id }).from(children).where(eq(children.id, childId)).get();
    if (!child) return badRequest("这个孩子不存在");

    const key =
      scope === "m"
        ? mediaKey(childId, uploadId)
        : scope === "t"
          ? thumbKey(childId, uploadId)
          : avatarKey(childId, uploadId);

    const contentType =
      request.headers.get("content-type") ??
      (scope === "t" || scope === "a" ? "image/jpeg" : "application/octet-stream");

    const storage = getStorage();
    await storage.put(key, request.body, contentType);

    let contentHash: string | undefined;
    if (scope === "m") {
      // 不信任浏览器上报的摘要：按实际收到的文件内容再做一次服务端去重。
      const stored = await storage.get(key);
      if (!stored?.body) throw new Error("上传文件读取失败");
      const digest = await sha256Stream(stored.body);
      contentHash = digest;
      const duplicate = await findDuplicateMedia(childId, digest, stored.size);
      if (duplicate) {
        // uploadId 相同说明是重试，不能误删已有记录正在引用的原文件。
        if (duplicate.fileKey !== key) await storage.delete(key);
        return Response.json(
          { error: "这个文件已经存在，不会重复保存", media: serializeMedia(duplicate) },
          { status: 409 },
        );
      }
    }

    return Response.json({ key, uploadId, contentHash });
  } catch (error) {
    return serverError(error);
  }
}
