import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/lib/platform/auth-node";

const MAX_AGE = 60 * 60 * 24 * 30;

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  const proto = (await headers()).get("x-forwarded-proto");
  store.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 });
}
