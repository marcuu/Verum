import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_PREFERENCES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAuth("PUT");
  if (unauth) return unauth;

  const patch = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  // R1/R2 only expose timezone, daily_enabled and daily_time. Later releases
  // can widen this allowlist as their features ship.
  const allowed = {
    timezone: patch.timezone,
    daily_enabled: patch.daily_enabled,
    daily_time: patch.daily_time,
  };

  const cleaned = Object.fromEntries(
    Object.entries(allowed).filter(([, value]) => value !== undefined)
  );

  const { data, error } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .update({
      ...cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
