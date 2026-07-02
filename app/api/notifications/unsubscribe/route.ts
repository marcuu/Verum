import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_SUBSCRIPTIONS } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint;

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { error } = await db
    .from(T_NOTIFICATION_SUBSCRIPTIONS)
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("endpoint", endpoint);

  if (error) {
    return serverError("notifications.unsubscribe", error);
  }

  return NextResponse.json({ ok: true });
}
