import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_QUOTES } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/quotes/:id  (daily-pick rows cascade via FK)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth("DELETE");
  if (unauth) return unauth;

  const { id } = await params;
  const db = getSupabaseAdmin();

  const { error } = await db.from(T_QUOTES).delete().eq("id", id);
  if (error) {
    return serverError("quotes.delete", error);
  }
  return NextResponse.json({ ok: true });
}
