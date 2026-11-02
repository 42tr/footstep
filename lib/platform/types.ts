export type RangeSpec = { offset?: number; length?: number; suffix?: number };

export type StoredObject = {
  size: number;
  contentType: string | null;
  body: ReadableStream<Uint8Array> | null;
  /** 实际生效的分片；未请求分片时为 null。 */
  range: { offset: number; length: number } | null;
};

export interface StorageDriver {
  put(key: string, body: ReadableStream<Uint8Array> | Uint8Array, contentType: string): Promise<void>;
  get(key: string, range?: RangeSpec | null): Promise<StoredObject | null>;
  head(key: string): Promise<{ size: number; contentType: string | null } | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/** 解析 Range 请求头（还不知道大小时也能解析，suffix 形式交给驱动解决）。 */
export function parseRangeHeader(header: string | null): RangeSpec | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!m) return null;
  const [, start, end] = m;
  if (start === "" && end === "") return null;
  if (start === "") return { suffix: Number(end) };
  const offset = Number(start);
  const length = end === "" ? undefined : Number(end) - offset + 1;
  if (length !== undefined && length <= 0) return null;
  return { offset, length };
}
