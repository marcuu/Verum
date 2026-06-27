import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { localParts } from "@/lib/notifications/schedule";
import {
  T_NOTIFICATION_PREFERENCES,
  T_NOTIFICATION_SUBSCRIPTIONS,
} from "@/lib/constants";
import { runDailyReminder } from "@/lib/notifications/jobs/dailyReminder";
import { runStreakRescue } from "@/lib/notifications/jobs/streakRescue";
import { runWeeklyReflection } from "@/lib/notifications/jobs/weeklyReflection";
import { runMonthlyBackup } from "@/lib/notifications/jobs/monthlyBackup";
import type { JobContext, JobResult } from "@/lib/notifications/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One dedicated daily Vercel cron per job (Hobby plan = once-a-day frequency),
// each pinned to its own UTC time and passing ?job=. The cron schedule provides
// the timing, so jobs apply no time-of-day window — only their own eligibility
// (enabled flag, entry/streak checks, weekday/day-of-month) and per-period
// dedupe via verum_notification_deliveries.
const JOBS: Record<string, (ctx: JobContext) => Promise<JobResult>> = {
  daily: runDailyReminder,
  rescue: runStreakRescue,
  weekly: runWeeklyReflection,
  backup: runMonthlyBackup,
};

// Vercel cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
// set. We also accept `?secret=` as a fallback for external schedulers.
function assertCron(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const auth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  if (auth === `Bearer ${secret}` || querySecret === secret) {
    return null;
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const unauth = assertCron(req);
  if (unauth) return unauth;

  const job = req.nextUrl.searchParams.get("job") ?? "daily";
  const runner = JOBS[job];

  if (!runner) {
    return NextResponse.json(
      { ok: false, error: "unknown_job", job },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: prefs, error: prefsError } = await db
    .from(T_NOTIFICATION_PREFERENCES)
    .select("*")
    .eq("id", true)
    .single();

  if (prefsError) {
    return NextResponse.json({ error: prefsError.message }, { status: 500 });
  }

  const timezone = prefs.timezone || "Europe/London";
  const local = localParts(timezone);

  const { data: subs, error: subsError } = await db
    .from(T_NOTIFICATION_SUBSCRIPTIONS)
    .select("*")
    .eq("enabled", true);

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const result = await runner({ db, prefs, local, subs: subs ?? [] });

  return NextResponse.json({ ok: true, job, local, result });
}
