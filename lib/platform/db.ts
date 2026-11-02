import { createDb, type AppDb } from "@/platform/db-impl";

let cached: AppDb | null = null;

export function getDb(): AppDb {
  cached ??= createDb();
  return cached;
}

export { type AppDb };
