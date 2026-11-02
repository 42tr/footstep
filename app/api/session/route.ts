import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { CHILD_COOKIE } from "@/lib/session";
import { badRequest, serverError } from "@/lib/api";
import { getDb } from "@/db";
import { children } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { childId?: unknown };
    const childId = Number(payload.childId);
    if (!Number.isInteger(childId) || childId <= 0) return badRequest("childId 不合法");

    const db = getDb();
    const row = await db.select().from(children).where(eq(children.id, childId)).get();
    if (!row) return badRequest("这个孩子不存在");

    const store = await cookies();
    store.set(CHILD_COOKIE, String(childId), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 5,
      sameSite: "lax",
    });
    return Response.json({ ok: true, childId });
  } catch (error) {
    return serverError(error);
  }
}
