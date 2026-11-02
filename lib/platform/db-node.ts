/* eslint-disable @typescript-eslint/no-explicit-any -- drizzle sqlite-proxy 的回调契约本身就是 any[]，这里是 FFI 边界 */
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "@/db/schema";

let client: DatabaseSync | null = null;

function db(): DatabaseSync {
  if (!client) {
    client = new DatabaseSync(process.env.LS_DB_PATH || "/data/app.db");
    client.exec("PRAGMA journal_mode = WAL");
    client.exec("PRAGMA foreign_keys = ON");
    client.exec("PRAGMA busy_timeout = 5000");
  }
  return client;
}

type ProxyResult = { rows: any[] };

/**
 * 用 Node 内置的 node:sqlite 当执行器，免去任何原生模块编译。
 * drizzle 的 sqlite-proxy 约定：rows 是「按列位置排列的数组」，
 * 'get' 的 rows 直接就是那一行（或 undefined）。
 */
/** 不同 Node 小版本里 node:sqlite 的 API 略有差异：有 raw() 就直接拿数组行，没有就把对象行按列顺序转成数组。 */
function toRowArray(row: unknown): unknown[] | undefined {
  if (row === undefined || row === null) return undefined;
  if (Array.isArray(row)) return row;
  return Object.values(row as Record<string, unknown>);
}

function execute(sqlText: string, params: unknown[], method: string): ProxyResult {
  const prepared = db().prepare(sqlText) as StatementSync & { raw?: (enabled?: boolean) => unknown };
  const supportsRaw = typeof prepared.raw === "function";
  if (supportsRaw) (prepared as { raw: (enabled?: boolean) => void }).raw(true);
  const clean = params.map((p) => (p === undefined ? null : (p as null | number | string | bigint | Uint8Array)));

  if (method === "run") {
    prepared.run(...clean);
    return { rows: [] };
  }
  if (method === "get") {
    // drizzle 约定：'get' 的 rows 就是那一行本身（数组），没有则 undefined
    const row = toRowArray(prepared.get(...clean));
    return { rows: row as never };
  }
  const rows = prepared.all(...clean) as unknown[];
  return { rows: (supportsRaw ? rows : rows.map((r) => toRowArray(r))) as any[] };
}

export function createDb() {
  return drizzle(
    async (sqlText, params, method) => execute(sqlText, params as unknown[], method),
    async (queries) => queries.map((q) => execute(q.sql, q.params as unknown[], q.method)),
    { schema },
  );
}

export type AppDb = ReturnType<typeof createDb>;

export const platformName = "node" as const;
