import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { members } from "@/db/schema";

export type Actor = {
  userId: string | null;
  email: string;
  /** 家人给自己起的称呼，例如「妈妈」。没有就用平台显示名。 */
  label: string;
  role: string;
};

export async function getActor(): Promise<Actor> {
  const user = await getChatGPTUser();
  if (!user) return { userId: null, email: "", label: "家人", role: "" };

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
