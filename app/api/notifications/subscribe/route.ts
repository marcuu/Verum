import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_SUBSCRIPTIONS } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The server later makes outbound requests to this endpoint (web-push), so
// only accept well-formed https URLs of sane length — not arbitrary strings.
function isValidPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  try {
    return new URL(endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

function isKeyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 256;
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!isValidPushEndpoint(endpoint) || !isKeyString(p256dh) || !isKeyString(auth)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await db.from(T_NOTIFICATION_SUBSCRIPTIONS).upsert(
    {
      endpoint,
      p256dh,
      auth,
      enabled: true,
      failure_count: 0,
      user_agent: req.headers.get("user-agent"),
      last_seen_at: now,
      updated_at: now,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return serverError("notifications.subscribe", error);
  }

  return NextResponse.json({ ok: true });
}
