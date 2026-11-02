import { env } from "cloudflare:workers";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export type AppDb = DrizzleD1Database<typeof schema>;

export function createDb(): AppDb {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB`.",
    );
  }
  return drizzle(env.DB, { schema });
}

export const platformName = "cloudflare" as const;
