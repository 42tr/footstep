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

/** Worker 单次请求体上限约 100MB，留出余量；自托管版本沿用同一上限。 */
export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
