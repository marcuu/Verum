import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_ENTRIES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries/:day -> single entry (or empty shell if none)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const { day } = await params;
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_ENTRIES)
    .select("*")
    .eq("day", day)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? { day, text: "" });
}

// DELETE /api/entries/:day
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ day: string }> }
) {
  const unauth = await requireAuth("DELETE");
  if (unauth) return unauth;

  const { day } = await params;
  const db = getSupabaseAdmin();

  const { error } = await db.from(T_ENTRIES).delete().eq("day", day);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
