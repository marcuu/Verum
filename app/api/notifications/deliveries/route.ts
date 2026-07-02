import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_DELIVERIES } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications/deliveries -> the last few delivery attempts, newest
// first. Reminders that silently stop arriving are indistinguishable from a
// quiet week — this surface makes failures visible from inside the product.
// Session-only, like all notification settings.
export async function GET() {
  const unauth = await requireAuth("GET", { allowPublicRead: false });
  if (unauth) return unauth;

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_NOTIFICATION_DELIVERIES)
    .select("id, created_at, notification_type, status, error")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return serverError("notifications.deliveries.list", error);
  }

  return NextResponse.json(data ?? []);
}
