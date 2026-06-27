import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE = "verum_token";

// The shared secret. Mirrors the Flask JOURNAL_ACCESS_TOKEN model.
export function expectedToken(): string | undefined {
  return process.env.JOURNAL_ACCESS_TOKEN;
}

// Allow unauthenticated GET requests when JOURNAL_PUBLIC_READ=true.
export function publicRead(): boolean {
  return (process.env.JOURNAL_PUBLIC_READ ?? "false").toLowerCase() === "true";
}

export function tokenMatches(token: string | undefined | null): boolean {
  const expected = expectedToken();
  return !!expected && token === expected;
}

// Read the token from the httpOnly cookie (set at login).
export async function cookieToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value;
}

// Guard for API route handlers. Returns a 401 NextResponse when unauthorized,
// otherwise null (meaning: proceed). GET is allowed without a token when
// JOURNAL_PUBLIC_READ is enabled, matching the original Flask behaviour.
export async function requireAuth(method: string): Promise<NextResponse | null> {
  if (method === "GET" && publicRead()) return null;
  const token = await cookieToken();
  if (!tokenMatches(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
