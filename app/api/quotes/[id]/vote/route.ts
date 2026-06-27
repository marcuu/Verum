import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcTs } from "@/lib/dates";
import { T_QUOTES, isCore } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/quotes/:id/vote  { delta: -1 | 1 }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { delta?: number };
  const delta = Number(body.delta || 0);

  if (delta !== -1 && delta !== 1) {
    return NextResponse.json(
      { error: "delta must be -1 or 1" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: row, error: getErr } = await db
    .from(T_QUOTES)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (getErr) {
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ts = utcTs();
  const { data: updated, error: updErr } = await db
    .from(T_QUOTES)
    .update({ score: row.score + delta, updated_at: ts })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    quote: { ...updated, is_core: isCore(updated.score) },
  });
}
