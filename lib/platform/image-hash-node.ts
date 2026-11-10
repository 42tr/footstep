import { createHash } from "node:crypto";
import sharp from "sharp";

/**
 * 对方向归一化后的原始像素求摘要，忽略 EXIF 等文件元数据。
 * 同一张 iPhone 照片即使被重新封装，也能得到相同摘要。
 */
export async function imageHashStream(body: ReadableStream<Uint8Array>): Promise<string | null> {
  try {
    const input = Buffer.from(await new Response(body).arrayBuffer());
    const { data, info } = await sharp(input, { failOn: "error" })
      .rotate()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return createHash("sha256")
      .update(`${info.width}:${info.height}:${info.channels}:`)
      .update(data)
      .digest("hex");
  } catch {
    // 不支持或损坏的图片仍保留文件字节查重，不阻断原上传流程。
    return null;
  }
}
