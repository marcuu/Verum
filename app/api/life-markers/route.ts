import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { utcTs } from "@/lib/dates";
import { T_LIFE_MARKERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MARKERS = 12;
const MAX_LABEL_LENGTH = 40;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// GET /api/life-markers -> list life markers, ordered by week
export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(T_LIFE_MARKERS)
    .select("*")
    .order("week_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/life-markers { week_index, label, accent } -> upsert by week
export async function POST(req: NextRequest) {
  const unauth = await requireAuth("POST");
  if (unauth) return unauth;

  const body = (await req.json().catch(() => ({}))) as {
    week_index?: number;
    label?: string;
    accent?: string;
  };
  const weekIndex = Number(body.week_index);
  const label = (body.label || "").trim().slice(0, MAX_LABEL_LENGTH);
  const accent = (body.accent || "").trim();

  if (!Number.isInteger(weekIndex) || weekIndex < 0) {
    return NextResponse.json(
      { error: "week_index must be a non-negative integer" },
      { status: 400 }
    );
  }
  if (!label) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  if (!HEX_COLOR.test(accent)) {
    return NextResponse.json(
      { error: "accent must be a #RRGGBB color" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: existingErr } = await db
    .from(T_LIFE_MARKERS)
    .select("week_index")
    .eq("week_index", weekIndex)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  if (!existing) {
    const { count, error: countErr } = await db
      .from(T_LIFE_MARKERS)
      .select("week_index", { count: "exact", head: true });

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }
    if ((count ?? 0) >= MAX_MARKERS) {
      return NextResponse.json(
        { error: `life markers are capped at ${MAX_MARKERS}` },
        { status: 409 }
      );
    }
  }

  const ts = utcTs();
  const { data, error } = await db
    .from(T_LIFE_MARKERS)
    .upsert(
      { week_index: weekIndex, label, accent, updated_at: ts },
      { onConflict: "week_index", ignoreDuplicates: false }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, marker: data });
}
