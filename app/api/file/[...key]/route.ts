import { denyIfAnonymous } from "@/lib/platform/guard";
import { serverError } from "@/lib/api";
import { getStorage, parseRangeHeader } from "@/lib/platform/storage";

export const dynamic = "force-dynamic";

/** 只允许读取我们自己生成的三类对象：m=原图/视频，t=缩略图，a=头像。 */
const ALLOWED_SCOPE = new Set(["m", "t", "a"]);

function resolveKey(segments: string[] | undefined): string | null {
  if (!segments?.length || !ALLOWED_SCOPE.has(segments[0])) return null;
  const key = segments.join("/");
  if (key.length > 200 || key.includes("..")) return null;
  return key;
}

export async function GET(request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const { key: segments } = await ctx.params;
    const key = resolveKey(segments);
    if (!key) return new Response(null, { status: 404 });

    const range = parseRangeHeader(request.headers.get("range"));
    const object = await getStorage().get(key, range);
    if (!object) return new Response(null, { status: 404 });

    const headers = new Headers();
    if (object.contentType) headers.set("content-type", object.contentType);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "private, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");

    if (object.range) {
      const { offset, length } = object.range;
      headers.set("content-range", `bytes ${offset}-${Math.max(offset, offset + length - 1)}/${object.size}`);
      headers.set("content-length", String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set("content-length", String(object.size));
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    return serverError(error);
  }
}

export async function HEAD(request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const { key: segments } = await ctx.params;
    const key = resolveKey(segments);
    if (!key) return new Response(null, { status: 404 });

    const object = await getStorage().head(key);
    if (!object) return new Response(null, { status: 404 });

    const headers = new Headers();
    if (object.contentType) headers.set("content-type", object.contentType);
    headers.set("accept-ranges", "bytes");
    headers.set("content-length", String(object.size));
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 500 });
  }
}
