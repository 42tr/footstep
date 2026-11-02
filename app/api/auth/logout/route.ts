import { cookies } from "next/headers";
import { serverError } from "@/lib/api";
import { destroySession, SESSION_COOKIE } from "@/lib/platform/auth-node";
import { clearSessionCookie } from "@/lib/platform/session-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) await destroySession(token);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
