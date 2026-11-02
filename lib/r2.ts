import { env } from "cloudflare:workers";

export function getBucket(): R2Bucket {
  if (!env.BUCKET) {
    throw new Error(
      "R2 存储桶 `BUCKET` 不可用。请确认 .openai/hosting.json 里的 r2 字段已设置为 `BUCKET`。",
    );
  }
  return env.BUCKET;
}

export function mediaKey(childId: number, id: string): string {
  return `m/${childId}/${id}`;
}

export function thumbKey(childId: number, id: string): string {
  return `t/${childId}/${id}.jpg`;
}

export function avatarKey(childId: number, id: string): string {
  return `a/${childId}/${id}.jpg`;
}

/** Worker 单次请求体上限约 100MB，留出余量。 */
export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
