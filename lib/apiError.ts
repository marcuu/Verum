import { NextResponse } from "next/server";

// Log the real database/internal error server-side, return a generic body.
// Raw Supabase/Postgres messages leak schema details (table and constraint
// names) to clients — especially bad when JOURNAL_PUBLIC_READ is enabled.
export function serverError(context: string, error: unknown): NextResponse {
  console.error(`[verum] ${context}:`, error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
