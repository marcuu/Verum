import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, tokenMatches } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };

  if (!tokenMatches(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
