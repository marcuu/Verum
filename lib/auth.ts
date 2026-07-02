import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { safeEqual, sessionCookieName, verifySessionValue } from "@/lib/session";

// The shared secret. Mirrors the Flask JOURNAL_ACCESS_TOKEN model. Only the
// login route compares against it; authenticated requests carry a derived
// session cookie instead (see lib/session.ts).
export function expectedToken(): string | undefined {
  return process.env.JOURNAL_ACCESS_TOKEN;
}

// Allow unauthenticated GET requests when JOURNAL_PUBLIC_READ=true.
export function publicRead(): boolean {
  return (process.env.JOURNAL_PUBLIC_READ ?? "false").toLowerCase() === "true";
}

// Constant-time check of the submitted access token.
export async function tokenMatches(
  token: string | undefined | null
): Promise<boolean> {
  const expected = expectedToken();
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

// True when the request's session cookie carries a valid, unexpired session.
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(sessionCookieName())?.value);
}

// Cross-site request check for state-changing methods. SameSite=Lax already
// keeps the cookie off cross-site POSTs; this is defense in depth in case a
// browser/webview weakens that, and it costs nothing for same-origin callers.
async function isSameOriginRequest(): Promise<boolean> {
  const h = await headers();

  const fetchSite = h.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = h.get("origin");
  if (!origin) return true; // non-browser clients (curl, tests)

  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type AuthOptions = {
  // Set false on routes that must stay private even when JOURNAL_PUBLIC_READ
  // is enabled (full export, notification settings).
  allowPublicRead?: boolean;
};

// Guard for API route handlers. Returns a 401/403 NextResponse when
// unauthorized, otherwise null (meaning: proceed). GET is allowed without a
// session when JOURNAL_PUBLIC_READ is enabled, matching the original Flask
// behaviour — but only for routes that opt in via allowPublicRead.
export async function requireAuth(
  method: string,
  opts: AuthOptions = {}
): Promise<NextResponse | null> {
  const { allowPublicRead = true } = opts;

  if (method === "GET" && allowPublicRead && publicRead()) return null;

  if (method !== "GET" && method !== "HEAD") {
    if (!(await isSameOriginRequest())) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
