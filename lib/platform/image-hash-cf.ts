/** Cloudflare 没有原生图像解码器，保留文件字节查重。 */
export async function imageHashStream(body: ReadableStream<Uint8Array>): Promise<string | null> {
  void body;
  return null;
}
