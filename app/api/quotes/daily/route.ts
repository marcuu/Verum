import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcDay } from "@/lib/dates";
import { CORE_THRESHOLD, AVOID_DAYS, isCore } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotes/daily -> today's pick (chosen + recorded atomically in SQL)
export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const day = utcDay();
  const db = getSupabaseAdmin();

  const { data, error } = await db.rpc("verum_pick_daily_quote", {
    p_day: day,
    p_core_threshold: CORE_THRESHOLD,
    p_avoid_days: AVOID_DAYS,
  });

  if (error) {
    return serverError("quotes.daily", error);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const quote = row ? { ...row, is_core: isCore(row.score) } : null;
  return NextResponse.json({ day, quote });
}
