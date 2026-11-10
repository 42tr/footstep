import { createHash } from "node:crypto";

/** Node 自托管版流式计算，避免为大视频分配与文件等大的内存。 */
export async function sha256Stream(body: ReadableStream<Uint8Array>): Promise<string> {
  const hash = createHash("sha256");
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) hash.update(value);
    }
  } finally {
    reader.releaseLock();
  }
  return hash.digest("hex");
}
