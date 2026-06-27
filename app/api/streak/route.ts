import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcDay } from "@/lib/dates";
import { T_ENTRIES } from "@/lib/constants";
import { computeStreak } from "@/lib/streak";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/streak -> { current, best, loggedToday, lastDay }
// Always derived from the full entry history (independent of any search filter
// applied to /api/entries), so the headline streak stays accurate.
export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(T_ENTRIES)
    .select("day")
    .order("day", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const days = (data ?? []).map((r) => r.day as string);
  return NextResponse.json(computeStreak(days, utcDay()));
}
