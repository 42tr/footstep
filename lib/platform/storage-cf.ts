import { env } from "cloudflare:workers";
import type { StorageDriver, StoredObject } from "./types";

export function createStorage(): StorageDriver {
  const bucket = env.BUCKET;
  if (!bucket) {
    throw new Error("R2 存储桶 `BUCKET` 不可用。请确认 .openai/hosting.json 的 r2 字段为 `BUCKET`。");
  }

  return {
    async put(key, body, contentType) {
      await bucket.put(key, body as ReadableStream, { httpMetadata: { contentType } });
    },
    async get(key, range) {
      const object = await bucket.get(key, range ? { range: range as R2Range } : undefined);
      if (!object) return null;
      const applied = object.range as { offset?: number; length?: number } | undefined;
      const resolved =
        applied && applied.length !== undefined
          ? { offset: applied.offset ?? 0, length: applied.length }
          : null;
      return {
        size: object.size,
        contentType: object.httpMetadata?.contentType ?? null,
        body: object.body,
        range: resolved,
      } satisfies StoredObject;
    },
    async head(key) {
      const object = await bucket.head(key);
      if (!object) return null;
      return { size: object.size, contentType: object.httpMetadata?.contentType ?? null };
    },
    async delete(key) {
      await bucket.delete(key);
    },
    async list(prefix) {
      const out: string[] = [];
      let cursor: string | undefined;
      let guard = 0;
      do {
        const page = await bucket.list({ prefix, cursor, limit: 1000 });
        out.push(...page.objects.map((o) => o.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor && ++guard < 200);
      return out;
    },
  };
}

export const platformName = "cloudflare" as const;
