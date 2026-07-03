import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { safeEqual } from "@/lib/session";
import { APP_TIMEZONE } from "@/lib/dates";
import { serverError } from "@/lib/apiError";
import { localParts } from "@/lib/notifications/schedule";
import {
  T_NOTIFICATION_PREFERENCES,
  T_NOTIFICATION_SUBSCRIPTIONS,
} from "@/lib/constants";
import { runDailyReminder } from "@/lib/notifications/jobs/dailyReminder";
import { runStreakRescue } from "@/lib/notifications/jobs/streakRescue";
import { runWeeklyReflection } from "@/lib/notifications/jobs/weeklyReflection";
import { runMonthlyBackup } from "@/lib/notifications/jobs/monthlyBackup";
import { sendSystemAlert } from "@/lib/notifications/alert";
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
// set. Header only — secrets in query strings end up in request logs, proxy
// logs and copied URLs. Comparison is constant-time.
async function assertCron(req: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";

  if (secret && (await safeEqual(auth, `Bearer ${secret}`))) {
    return null;
  }

  console.warn("[cron] unauthorized request to /api/cron/notifications");
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const unauth = await assertCron(req);
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
    return serverError("cron.preferences", prefsError);
  }

  const timezone = prefs.timezone || APP_TIMEZONE;
  const local = localParts(timezone);

  const { data: subs, error: subsError } = await db
    .from(T_NOTIFICATION_SUBSCRIPTIONS)
    .select("*")
    .eq("enabled", true);

  if (subsError) {
    return serverError("cron.subscriptions", subsError);
  }

  // A throwing job must not die silently in a scheduled function: log it,
  // page the owner over the app's own push channel (deduped to one alert per
  // day), and return 500 so the platform records the run as failed.
  try {
    const result = await runner({ db, prefs, local, subs: subs ?? [] });
    return NextResponse.json({ ok: true, job, local, result });
  } catch (err) {
    console.error(`[verum] cron.${job}:`, err);
    await sendSystemAlert({
      db,
      subs: subs ?? [],
      job,
      isoDay: local.isoDay,
      error: (err as { message?: string })?.message ?? String(err),
    });
    return NextResponse.json(
      { ok: false, job, error: "job_failed" },
      { status: 500 }
    );
  }
}
