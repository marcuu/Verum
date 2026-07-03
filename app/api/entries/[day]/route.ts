import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_ENTRIES } from "@/lib/constants";
import { isValidDayString } from "@/lib/dates";
import { serverError } from "@/lib/apiError";

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
  if (!isValidDayString(day)) {
    return NextResponse.json({ error: "invalid day" }, { status: 400 });
  }
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_ENTRIES)
    .select("*")
    .eq("day", day)
    .maybeSingle();

  if (error) {
    return serverError("entries.get", error);
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
  if (!isValidDayString(day)) {
    return NextResponse.json({ error: "invalid day" }, { status: 400 });
  }
  const db = getSupabaseAdmin();

  const { error } = await db.from(T_ENTRIES).delete().eq("day", day);
  if (error) {
    return serverError("entries.delete", error);
  }
  return NextResponse.json({ ok: true });
}
