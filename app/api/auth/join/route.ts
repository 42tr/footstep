import { eq } from "drizzle-orm";
import { badRequest, clampString, serverError } from "@/lib/api";
import { getDb } from "@/lib/platform/db";
import { accounts, invites } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/platform/auth-node";
import { setSessionCookie } from "@/lib/platform/session-cookie";
import { isNodePlatform } from "@/lib/platform/target";

export const dynamic = "force-dynamic";

/** 家人凭一次性邀请码加入：任何时候都可用（包括第一个账号）。 */
export async function POST(request: Request) {
  try {
    if (!isNodePlatform()) return badRequest("本站使用平台登录，不需要创建账号");

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = clampString(p.code, 32).toUpperCase();
    const nickname = clampString(p.nickname, 24);
    const password = String(p.password ?? "");

    if (!code) return badRequest("请输入家人给你的邀请码");
    if (!nickname) return badRequest("给自己起个称呼，例如「爸爸」");
    if (password.length < 6) return badRequest("密码至少 6 位");

    const db = getDb();
    const invite = await db.select().from(invites).where(eq(invites.code, code)).get();
    if (!invite) return badRequest("邀请码不对，问问发码的人有没有抄错");
    if (invite.usedBy !== null) return badRequest("这个邀请码已经用过了，请家人再生成一个");

    const dup = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.nickname, nickname)).get();
    if (dup) return badRequest("这个称呼已经有人用了，换一个吧");

    const [account] = await db
      .insert(accounts)
      .values({ nickname, passHash: hashPassword(password), role: invite.label || "家人" })
      .returning();
    await db.update(invites).set({ usedBy: account.id }).where(eq(invites.code, code)).run();

    const token = await createSession(account.id);
    await setSessionCookie(token);
    return Response.json({ ok: true, nickname: account.nickname }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
