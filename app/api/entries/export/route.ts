import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_ENTRIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries/export -> all entries (oldest first) as pretty JSON
export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(T_ENTRIES)
    .select("*")
    .order("day", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(JSON.stringify(data ?? [], null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
