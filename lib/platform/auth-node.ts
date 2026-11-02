import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/platform/db";
import { accounts, sessions } from "@/db/schema";

export const SESSION_COOKIE = "ls_session";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString("hex");
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, n, r, p, salt, hash] = stored.split(":");
    if (algo !== "scrypt") return false;
    const candidate = scryptSync(password, salt, KEY_LEN, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(accountId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  await db
    .insert(sessions)
    .values({ tokenHash: tokenHash(token), accountId, lastSeenAt: new Date().toISOString() })
    .run();
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token))).run();
}

export type NodeAccount = { id: number; nickname: string; role: string };

export async function accountByToken(token: string): Promise<NodeAccount | null> {
  const db = getDb();
  const row = await db
    .select({
      id: accounts.id,
      nickname: accounts.nickname,
      role: accounts.role,
      tokenHash: sessions.tokenHash,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .where(eq(sessions.tokenHash, tokenHash(token)))
    .get();
  if (!row) return null;
  // 顺手刷新最后活跃时间（失败无所谓）
  db.update(sessions)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(sessions.tokenHash, row.tokenHash))
    .run()
    .catch?.(() => {});
  return { id: row.id, nickname: row.nickname, role: row.role };
}

export async function countAccounts(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: accounts.id }).from(accounts).all();
  return rows.length;
}

export function newInviteCode(): string {
  // 去掉易混字符，方便老人在手机上输入
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i] % alphabet.length];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
