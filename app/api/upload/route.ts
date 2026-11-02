import { eq } from "drizzle-orm";
import { badRequest, serverError } from "@/lib/api";
import { getDb } from "@/db";
import { children } from "@/db/schema";
import { avatarKey, getBucket, MAX_UPLOAD_BYTES, mediaKey, thumbKey } from "@/lib/r2";

export const dynamic = "force-dynamic";

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * 流式直传：请求体原样交给 R2，不在 Worker 内存里缓冲整个文件，
 * 这样几百 MB 的视频也不会撑爆 128MB 的 isolate。
 */
export async function POST(request: Request) {
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

    await getBucket().put(key, request.body, { httpMetadata: { contentType } });

    return Response.json({ key, uploadId });
  } catch (error) {
    return serverError(error);
  }
}
