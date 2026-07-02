import { NextRequest, NextResponse } from "next/server";
import { tokenMatches } from "@/lib/auth";
import {
  createSessionValue,
  sessionCookieName,
  SESSION_TTL_SECONDS,
} from "@/lib/session";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rateLimit";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const key = `login:${ip}`;

  if (isRateLimited(key)) {
    console.warn(`[auth] rate-limited login attempt ip=${ip}`);
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const { token } = (await req.json().catch(() => ({}))) as { token?: string };

  if (!(await tokenMatches(token))) {
    recordFailure(key);
    console.warn(`[auth] failed login attempt ip=${ip}`);
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  clearFailures(key);

  // Issue a derived, expiring session instead of storing the shared secret
  // in the cookie. A stolen cookie ages out and can be revoked by rotating
  // SESSION_SECRET, without touching the access token itself.
  const session = await createSessionValue();
  if (!session) {
    console.error("[auth] cannot create session: no secret configured");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
