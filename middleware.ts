import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/platform/auth-node";

export const runtime = "nodejs";

/**
 * 自托管目标下，在渲染之前把未登录的请求挡去 /login（真正的 307）。
 * Cloudflare 目标不设 LS_TARGET，直接放行，继续由平台闸门负责。
 */
export function middleware(request: NextRequest) {
  if (process.env.LS_TARGET !== "node") return NextResponse.next();
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ["/((?!api/|login|_next/|favicon\\.svg|icon-\\d+\\.png|manifest\\.webmanifest).*)"],
};
