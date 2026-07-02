import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_LIFE_MARKERS } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/life-markers/:week -> remove one life marker
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const unauth = await requireAuth("DELETE");
  if (unauth) return unauth;

  const { week } = await params;
  const weekIndex = Number(week);
  if (!Number.isInteger(weekIndex) || weekIndex < 0) {
    return NextResponse.json(
      { error: "week must be a non-negative integer" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from(T_LIFE_MARKERS)
    .delete()
    .eq("week_index", weekIndex);

  if (error) {
    return serverError("lifeMarkers.delete", error);
  }

  return NextResponse.json({ ok: true });
}
