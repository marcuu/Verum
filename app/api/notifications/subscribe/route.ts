import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_SUBSCRIPTIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
