import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { T_ENTRIES } from "@/lib/constants";
import { localDay } from "@/lib/dates";
import { entriesToMarkdown } from "@/lib/exportMarkdown";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/entries/export            -> all entries (oldest first), pretty JSON
// GET /api/entries/export?format=markdown -> the same record as a plain-text
//   Markdown archive (year chapters, dated entries) — the format that outlives
//   the stack. The full dump stays session-only even with JOURNAL_PUBLIC_READ.
export async function GET(req: NextRequest) {
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

  if (req.nextUrl.searchParams.get("format") === "markdown") {
    return new NextResponse(entriesToMarkdown(data ?? [], localDay()), {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  return new NextResponse(JSON.stringify(data ?? [], null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
