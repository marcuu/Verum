import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { T_NOTIFICATION_PREFERENCES } from "@/lib/constants";
import { serverError } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notification settings stay session-only even when JOURNAL_PUBLIC_READ is on.
export async function GET() {
  const unauth = await requireAuth("GET", { allowPublicRead: false });
  if (unauth) return unauth;

  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .select("*")
    .eq("id", true)
    .single();

  if (error) {
    return serverError("notifications.preferences.get", error);
  }

  return NextResponse.json(data);
}

// An invalid IANA zone would make localParts() throw and 500 every cron run.
function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  const unauth = await requireAuth("PUT");
  if (unauth) return unauth;

  const patch = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  // Editable preference allowlist (daily R2; rescue/weekly/backup R3–R5), with
  // light validation. Fields not present in the patch are left untouched.
  // The *_time columns are intentionally NOT editable: delivery times are
  // fixed by the vercel.json cron schedule, so accepting a time here would
  // store a promise the scheduler never reads. Stale clients that still send
  // them are ignored rather than rejected.
  const cleaned: Record<string, unknown> = {};
  const errors: string[] = [];

  const setBool = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (typeof value === "boolean") cleaned[key] = value;
    else errors.push(`${key} must be a boolean`);
  };
  const setInt = (key: string, value: unknown, min: number, max: number) => {
    if (value === undefined) return;
    const n = Number(value);
    if (Number.isInteger(n) && n >= min && n <= max) cleaned[key] = n;
    else errors.push(`${key} must be an integer ${min}-${max}`);
  };

  if (patch.timezone !== undefined) {
    if (
      typeof patch.timezone === "string" &&
      patch.timezone.length > 0 &&
      isValidTimezone(patch.timezone)
    ) {
      cleaned.timezone = patch.timezone;
    } else {
      errors.push("timezone must be a valid IANA timezone");
    }
  }

  setBool("daily_enabled", patch.daily_enabled);

  setBool("rescue_enabled", patch.rescue_enabled);
  setInt("rescue_min_streak", patch.rescue_min_streak, 2, 365);

  setBool("weekly_enabled", patch.weekly_enabled);
  setInt("weekly_day", patch.weekly_day, 0, 6);

  setBool("backup_enabled", patch.backup_enabled);
  setInt("backup_day_of_month", patch.backup_day_of_month, 1, 28);

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
    return serverError("notifications.preferences.update", error);
  }

  return NextResponse.json(data);
}
