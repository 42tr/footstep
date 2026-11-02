import { denyIfAnonymous } from "@/lib/platform/guard";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { members } from "@/db/schema";
import { badRequest, clampString, serverError } from "@/lib/api";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ member: null, signedIn: false });
    const row = await getDb().select().from(members).where(eq(members.userId, user.userId)).get();
    return Response.json({ member: row ?? null, signedIn: true, email: user.email, platformName: user.fullName });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    const user = await getChatGPTUser();
    if (!user) return badRequest("需要先登录才能设置称呼");

    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const nickname = clampString(p.nickname, 24);
    const role = clampString(p.role, 24);

    const db = getDb();
    const existing = await db.select().from(members).where(eq(members.userId, user.userId)).get();

    if (existing) {
      const [row] = await db
        .update(members)
        .set({ nickname, role, email: user.email, updatedAt: new Date().toISOString() })
        .where(eq(members.userId, user.userId))
        .returning();
      return Response.json({ member: row });
    }

    const [row] = await db
      .insert(members)
      .values({ userId: user.userId, nickname, role, email: user.email })
      .returning();
    return Response.json({ member: row }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
