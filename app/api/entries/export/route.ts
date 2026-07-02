import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_ENTRIES } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries/export -> all entries (oldest first) as pretty JSON.
// The full dump stays session-only even when JOURNAL_PUBLIC_READ is enabled.
export async function GET() {
  const unauth = await requireAuth("GET", { allowPublicRead: false });
  if (unauth) return unauth;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(T_ENTRIES)
    .select("*")
    .order("day", { ascending: true });

  if (error) {
    return serverError("entries.export", error);
  }

  return new NextResponse(JSON.stringify(data ?? [], null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
