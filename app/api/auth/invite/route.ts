import { isNull } from "drizzle-orm";
import { badRequest, clampString, serverError } from "@/lib/api";
import { getDb } from "@/lib/platform/db";
import { invites } from "@/db/schema";
import { newInviteCode } from "@/lib/platform/auth-node";
import { denyIfAnonymous, isNodePlatform } from "@/lib/platform/guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    if (!isNodePlatform()) return Response.json({ invites: [] });
    const rows = await getDb().select().from(invites).where(isNull(invites.usedBy)).all();
    return Response.json({ invites: rows });
  } catch (error) {
    return serverError(error);
  }
}

/** 已登录的家人可以生成新的邀请码，发给其他家人。 */
export async function POST(request: Request) {
  const denied = await denyIfAnonymous();
  if (denied) return denied;
  try {
    if (!isNodePlatform()) return badRequest("托管版本不需要邀请码");
    const p = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const label = clampString(p.label, 24) || "家人";
    const code = newInviteCode();
    const db = getDb();
    await db.insert(invites).values({ code, label }).run();
    return Response.json({ code, label }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
