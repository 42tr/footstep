/** 纯函数，客户端和服务端都能安全引用。 */
export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/file/${key.split("/").map(encodeURIComponent).join("/")}`;
}
