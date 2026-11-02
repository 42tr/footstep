import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/lib/platform/db";
import { members } from "@/db/schema";
import { accountByToken, SESSION_COOKIE } from "@/lib/platform/auth-node";
import { isNodePlatform } from "@/lib/platform/target";

export type Actor = {
  userId: string | null;
  email: string;
  /** 家人给自己起的称呼，例如「妈妈」。 */
  label: string;
  role: string;
};

const ANONYMOUS: Actor = { userId: null, email: "", label: "家人", role: "" };

export async function getActor(): Promise<Actor> {
  // 自托管：用本站的家庭账号会话
  if (isNodePlatform()) {
    try {
      const store = await cookies();
      const token = store.get(SESSION_COOKIE)?.value;
      if (!token) return ANONYMOUS;
      const account = await accountByToken(token);
      if (!account) return ANONYMOUS;
      return { userId: `acct:${account.id}`, email: "", label: account.nickname, role: account.role };
    } catch {
      return ANONYMOUS;
    }
  }

  // 托管：Sign in with ChatGPT 注入的身份头
  const user = await getChatGPTUser();
  if (!user) return ANONYMOUS;

  let nickname = "";
  let role = "";
  try {
    const db = getDb();
    const row = await db.select().from(members).where(eq(members.userId, user.userId)).get();
    nickname = row?.nickname ?? "";
    role = row?.role ?? "";
  } catch {
    // 表还没建好时不要挡住功能
  }

  const label = nickname || user.fullName || user.email.split("@")[0] || "家人";
  return { userId: user.userId, email: user.email, label, role };
}
