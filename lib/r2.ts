/** 对象键构造与上传上限。纯函数，两个平台通用。 */
export function mediaKey(childId: number, id: string): string {
  return `m/${childId}/${id}`;
}

export function thumbKey(childId: number, id: string): string {
  return `t/${childId}/${id}.jpg`;
}

export function avatarKey(childId: number, id: string): string {
  return `a/${childId}/${id}.jpg`;
}

/** 自托管（LS_TARGET=node）上限 1GB；Cloudflare Worker 单次请求体上限约 100MB，沿用 90MB 余量。 */
export const MAX_UPLOAD_BYTES =
  process.env.LS_TARGET === "node" ? 1024 * 1024 * 1024 : 90 * 1024 * 1024;
