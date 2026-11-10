/** Cloudflare 版使用运行时原生摘要接口。 */
export async function sha256Stream(body: ReadableStream<Uint8Array>): Promise<string> {
  const bytes = await new Response(body).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
