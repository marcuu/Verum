import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcTs } from "@/lib/dates";
import { T_QUOTES, CORE_THRESHOLD, isCore } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotes?core=1|0 -> list quotes (all / core only / regular only)
export async function GET(req: NextRequest) {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const core = req.nextUrl.searchParams.get("core");
  const db = getSupabaseAdmin();

  let query = db.from(T_QUOTES).select("*").order("updated_at", {
    ascending: false,
  });

  if (core === "1") query = query.gte("score", CORE_THRESHOLD);
  else if (core === "0") query = query.lt("score", CORE_THRESHOLD);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const out = (data ?? []).map((q) => ({ ...q, is_core: isCore(q.score) }));
  return NextResponse.json(out);
}

// POST /api/quotes  { text, author? } -> create (idempotent on text+author)
export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    author?: string;
  };
  const text = (body.text || "").trim();
  const author = (body.author || "").trim();

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const ts = utcTs();
  const db = getSupabaseAdmin();

  // Upsert on the (text, author) unique constraint -> idempotent create.
  const { error: upErr } = await db.from(T_QUOTES).upsert(
    { text, author, updated_at: ts },
    { onConflict: "text,author", ignoreDuplicates: true }
  );
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data, error } = await db
    .from(T_QUOTES)
    .select("*")
    .eq("text", text)
    .eq("author", author)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const quote = data ? { ...data, is_core: isCore(data.score) } : null;
  return NextResponse.json({ ok: true, quote });
}
