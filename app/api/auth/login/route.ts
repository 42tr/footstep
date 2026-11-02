import { eq } from "drizzle-orm";
import { badRequest, clampString, serverError } from "@/lib/api";
import { getDb } from "@/lib/platform/db";
import { accounts } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/platform/auth-node";
import { setSessionCookie } from "@/lib/platform/session-cookie";
import { isNodePlatform } from "@/lib/platform/target";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isNodePlatform()) return badRequest("本站使用平台登录");
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const nickname = clampString(p.nickname, 24);
    const password = String(p.password ?? "");
    if (!nickname || !password) return badRequest("称呼密码都要填");

    const db = getDb();
    const account = await db.select().from(accounts).where(eq(accounts.nickname, nickname)).get();
    // 账号不存在和密码错误返回同一个提示，避免被枚举
    if (!account || !verifyPassword(password, account.passHash)) {
      return Response.json({ error: "称呼或密码不对" }, { status: 401 });
    }

    const token = await createSession(account.id);
    await setSessionCookie(token);
    return Response.json({ ok: true, nickname: account.nickname });
  } catch (error) {
    return serverError(error);
  }
}
