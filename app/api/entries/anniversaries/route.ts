import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcDay } from "@/lib/dates";
import { T_ENTRIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries/anniversaries
// -> real entries written on this exact month-day in prior years, newest first.
// Pure recall: same calendar date (MM-DD), strictly before today. No today, no
// future. If none exist the list is empty and the UI renders nothing.
export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const today = utcDay(); // YYYY-MM-DD
  const monthDay = today.slice(5); // MM-DD
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_ENTRIES)
    .select("*")
    .like("day", `%-${monthDay}`) // any year, this month-day
    .lt("day", today) // prior years only
    .order("day", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
