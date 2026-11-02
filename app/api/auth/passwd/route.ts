import { eq } from "drizzle-orm";
import { badRequest, serverError } from "@/lib/api";
import { getDb } from "@/lib/platform/db";
import { accounts } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/platform/auth-node";
import { denyIfAnonymous, isNodePlatform } from "@/lib/platform/guard";
import { getActor } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    if (!isNodePlatform()) return badRequest("托管版本的账号由平台管理");
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const current = String(p.current ?? "");
    const next = String(p.next ?? "");
    if (next.length < 6) return badRequest("新密码至少 6 位");

    const actor = await getActor();
    const id = Number(actor.userId?.replace("acct:", ""));
    if (!Number.isInteger(id)) return badRequest("登录状态异常，重新登录试试");

    const db = getDb();
    const account = await db.select().from(accounts).where(eq(accounts.id, id)).get();
    if (!account || !verifyPassword(current, account.passHash)) {
      return Response.json({ error: "当前密码不对" }, { status: 401 });
    }
    await db.update(accounts).set({ passHash: hashPassword(next) }).where(eq(accounts.id, id)).run();
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
