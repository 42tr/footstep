/** 纯函数，客户端和服务端都能安全引用。 */
export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const url = `/api/file/${key.split("/").map(encodeURIComponent).join("/")}`;
  // 缩略图可能被重新生成，升级地址版本以避开旧黑图的 immutable 浏览器缓存。
  return key.startsWith("t/") ? `${url}?v=2` : url;
}
