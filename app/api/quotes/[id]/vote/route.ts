import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcTs } from "@/lib/dates";
import { T_QUOTES, isCore } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

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

  // Compare-and-swap: the update only applies if the score still holds the
  // value we read, so two concurrent votes can't overwrite each other. On a
  // miss, re-read and retry — no SQL migration needed, unlike an RPC.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: getErr } = await db
      .from(T_QUOTES)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (getErr) {
      return serverError("quotes.vote.get", getErr);
    }
    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: updated, error: updErr } = await db
      .from(T_QUOTES)
      .update({ score: row.score + delta, updated_at: utcTs() })
      .eq("id", id)
      .eq("score", row.score)
      .select("*")
      .maybeSingle();
    if (updErr) {
      return serverError("quotes.vote.update", updErr);
    }
    if (updated) {
      return NextResponse.json({
        ok: true,
        quote: { ...updated, is_core: isCore(updated.score) },
      });
    }
  }

  return NextResponse.json({ error: "conflict" }, { status: 409 });
}
