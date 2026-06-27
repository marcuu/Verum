import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_PREFERENCES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const unauth = await requireAuth("GET");
  if (unauth) return unauth;

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Accepts "HH:mm" or "HH:mm:ss".
function isHHmm(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v);
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAuth("PUT");
  if (unauth) return unauth;

  const patch = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  // Editable preference allowlist (daily R2; rescue/weekly/backup R3–R5), with
  // light validation. Fields not present in the patch are left untouched.
  const cleaned: Record<string, unknown> = {};
  const errors: string[] = [];

  const setBool = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (typeof value === "boolean") cleaned[key] = value;
    else errors.push(`${key} must be a boolean`);
  };
  const setTime = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (isHHmm(value)) cleaned[key] = value;
    else errors.push(`${key} must be HH:mm`);
  };
  const setInt = (key: string, value: unknown, min: number, max: number) => {
    if (value === undefined) return;
    const n = Number(value);
    if (Number.isInteger(n) && n >= min && n <= max) cleaned[key] = n;
    else errors.push(`${key} must be an integer ${min}-${max}`);
  };

  if (patch.timezone !== undefined) {
    if (typeof patch.timezone === "string" && patch.timezone.length > 0) {
      cleaned.timezone = patch.timezone;
    } else {
      errors.push("timezone must be a non-empty string");
    }
  }

  setBool("daily_enabled", patch.daily_enabled);
  setTime("daily_time", patch.daily_time);

  setBool("rescue_enabled", patch.rescue_enabled);
  setTime("rescue_time", patch.rescue_time);
  setInt("rescue_min_streak", patch.rescue_min_streak, 2, 365);

  setBool("weekly_enabled", patch.weekly_enabled);
  setInt("weekly_day", patch.weekly_day, 0, 6);
  setTime("weekly_time", patch.weekly_time);

  setBool("backup_enabled", patch.backup_enabled);
  setInt("backup_day_of_month", patch.backup_day_of_month, 1, 28);
  setTime("backup_time", patch.backup_time);

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const { data, error } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .update({
      ...cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
