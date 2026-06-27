import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcTs, utcDay } from "@/lib/dates";
import { T_ENTRIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries?q=...  -> list (optionally full-text filtered), newest first
export async function GET(req: NextRequest) {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const db = getSupabaseAdmin();

  let query = db.from(T_ENTRIES).select("*").order("day", { ascending: false });
  if (q) query = query.ilike("text", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

// POST /api/entries  { day?, text }  -> upsert by day
export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = (await req.json().catch(() => ({}))) as {
    day?: string;
    text?: string;
  };
  const day = (body.day || utcDay()).trim();
  const text = (body.text || "").trim();

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const ts = utcTs();
  const db = getSupabaseAdmin();

  // Omit created_at: on insert the column default (now()) applies; on conflict
  // it is left untouched, preserving the original creation time (matches the
  // original ON CONFLICT DO UPDATE behaviour).
  const { error } = await db
    .from(T_ENTRIES)
    .upsert(
      { day, text, updated_at: ts },
      { onConflict: "day", ignoreDuplicates: false }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, day });
}
