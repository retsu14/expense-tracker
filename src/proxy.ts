import { NextResponse, type NextRequest } from "next/server";

import { buildCsp, createNonce } from "@/lib/csp";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/modules/identity/presentation/session-cookie";

const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/offline", "/privacy"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const landing = !token && pathname === "/";

  if (!token && pathname === "/welcome") {
    return NextResponse.redirect(new URL("/", request.url), 308);
  }

  if (!token && !landing && !PUBLIC_PAGES.includes(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (token && (pathname === "/login" || pathname === "/welcome")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = landing
    ? NextResponse.rewrite(new URL("/welcome", request.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (token && request.method === "GET") {
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|screens|opengraph-image|twitter-image|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)",
  ],
};
