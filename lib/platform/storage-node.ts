import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver, StoredObject } from "./types";

function root(): string {
  return process.env.LS_FILES_PATH || "/srv/little-steps/data/files";
}

/** key 形如 m/1/uuid，只允许安全字符，杜绝路径穿越。 */
function safePath(key: string): string | null {
  if (!key || key.length > 300 || key.includes("..") || key.startsWith("/")) return null;
  const segments = key.split("/");
  if (!segments.every((s) => /^[A-Za-z0-9._-]{1,80}$/.test(s))) return null;
  return path.join(root(), ...segments);
}

function metaPath(file: string) {
  return `${file}.lsmeta`;
}

async function readMeta(file: string): Promise<string | null> {
  try {
    const raw = await readFile(metaPath(file), "utf8");
    return (JSON.parse(raw) as { contentType?: string }).contentType ?? null;
  } catch {
    return null;
  }
}

async function toTempFile(body: ReadableStream<Uint8Array> | Uint8Array): Promise<string> {
  const tmp = path.join(root(), `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(root(), { recursive: true });
  if (body instanceof Uint8Array) {
    await writeFile(tmp, body);
    return tmp;
  }
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(tmp);
    Readable.fromWeb(body as never).pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
  });
  return tmp;
}

export function createStorage(): StorageDriver {
  return {
    async put(key, body, contentType) {
      const file = safePath(key);
      if (!file) throw new Error(`非法的对象键：${key}`);
      await mkdir(path.dirname(file), { recursive: true });
      let tmp: string | null = null;
      try {
        tmp = await toTempFile(body);
        await rename(tmp, file);
        tmp = null;
      } finally {
        // 客户端中断/写失败时别把半成品留在盘上
        if (tmp) await unlink(tmp).catch(() => {});
      }
      await writeFile(metaPath(file), JSON.stringify({ contentType })).catch(() => {});
    },

    async get(key, range) {
      const file = safePath(key);
      if (!file) return null;
      let info;
      try {
        info = await stat(file);
      } catch {
        return null;
      }
      const size = info.size;
      let offset = 0;
      let length = size;

      if (range) {
        if (range.suffix !== undefined) {
          length = Math.min(range.suffix, size);
          offset = size - length;
        } else {
          offset = range.offset ?? 0;
          if (offset >= size) return null;
          length = range.length !== undefined ? Math.min(range.length, size - offset) : size - offset;
        }
      }

      const stream =
        length === size && offset === 0
          ? (Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>)
          : (Readable.toWeb(
              createReadStream(file, { start: offset, end: offset + length - 1 }),
            ) as ReadableStream<Uint8Array>);

      return {
        size,
        contentType: await readMeta(file),
        body: stream,
        range: range ? { offset, length } : null,
      } satisfies StoredObject;
    },

    async head(key) {
      const file = safePath(key);
      if (!file) return null;
      try {
        const info = await stat(file);
        return { size: info.size, contentType: await readMeta(file) };
      } catch {
        return null;
      }
    },

    async delete(key) {
      const file = safePath(key);
      if (!file) return;
      await unlink(file).catch(() => {});
      await unlink(metaPath(file)).catch(() => {});
    },

    async list(prefix) {
      const base = root();
      const out: string[] = [];
      async function walk(dir: string, rel: string) {
        const { readdir } = await import("node:fs/promises");
        const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
          const relNext = rel ? `${rel}/${entry.name}` : entry.name;
          if (entry.isDirectory()) await walk(path.join(dir, entry.name), relNext);
          else if (!entry.name.endsWith(".lsmeta") && relNext.startsWith(prefix)) out.push(relNext);
        }
      }
      await walk(base, "");
      return out;
    },
  };
}

export const platformName = "node" as const;

// 让 rm 被引用，避免某些打包配置下 tree-shake 报错（保留显式依赖）
void rm;
