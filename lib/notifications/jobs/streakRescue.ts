import { T_ENTRIES } from "@/lib/constants";
import { sendLoggedNotification } from "../delivery";
import { computeStreakEndingOn, previousDay } from "../streak";
import type { JobContext, JobResult } from "../types";

// R3 streak rescue: a late nudge when an active streak (ending yesterday) is
// about to break and today still has no entry. Its own late cron runs after the
// daily reminder cron, so no "daily already sent" precondition is needed.
export async function runStreakRescue({
  db,
  prefs,
  local,
  subs,
}: JobContext): Promise<JobResult> {
  if (!prefs.rescue_enabled) {
    return { sent: 0, skipped: 0, failed: 0, reason: "disabled" };
  }

  const { data: todayEntry, error: todayError } = await db
    .from(T_ENTRIES)
    .select("day")
    .eq("day", local.isoDay)
    .maybeSingle();

  if (todayError) throw todayError;

  if (todayEntry) {
    return { sent: 0, skipped: 0, failed: 0, reason: "already_logged" };
  }

  // Streak ending yesterday, because today is intentionally missing.
  const yesterday = previousDay(local.isoDay);

  const { data: recentEntries, error: entriesError } = await db
    .from(T_ENTRIES)
    .select("day")
    .lte("day", yesterday)
    .order("day", { ascending: false })
    .limit(400);

  if (entriesError) throw entriesError;

  const streak = computeStreakEndingOn(
    (recentEntries ?? []).map((entry: { day: string }) => entry.day),
    yesterday
  );

  if (streak < (prefs.rescue_min_streak ?? 3)) {
    return { sent: 0, skipped: 0, failed: 0, reason: "streak_too_short", streak };
  }

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "streak_rescue",
      logicalDay: local.isoDay,
      payload: {
        title: "Verum",
        body: "Still time to capture today.",
        url: "/",
        tag: `verum-rescue-${local.isoDay}`,
        type: "streak_rescue",
      },
      meta: { timezone: prefs.timezone, streak },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts, streak };
}
