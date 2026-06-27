import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// Protect application pages. API routes self-guard via requireAuth(), and the
// login page / auth endpoints must stay reachable while logged out.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/logout");

  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = process.env.JOURNAL_ACCESS_TOKEN;
  const publicRead =
    (process.env.JOURNAL_PUBLIC_READ ?? "false").toLowerCase() === "true";

  const authed = !!expected && token === expected;

  if (!authed && !publicRead) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and the API namespace
  // (API handlers enforce auth themselves and need to return JSON 401s).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
