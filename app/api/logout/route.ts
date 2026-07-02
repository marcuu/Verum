import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), "", { path: "/", maxAge: 0 });
  // Clear the pre-session cookie that older clients may still hold.
  res.cookies.set("verum_token", "", { path: "/", maxAge: 0 });
  return res;
}
