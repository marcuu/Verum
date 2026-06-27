import { T_ENTRIES } from "@/lib/constants";
import { sendLoggedNotification } from "../delivery";
import {
  dayOfWeekSundayZero,
  endOfWeekSunday,
  isoWeekKey,
  startOfWeekMonday,
} from "../week";
import type { JobContext, JobResult } from "../types";

// R4 weekly reflection: a once-a-week prompt to review the record. Sends even
// with zero entries — the point is to nudge reflection or a restart.
export async function runWeeklyReflection({
  db,
  prefs,
  local,
  subs,
}: JobContext): Promise<JobResult> {
  if (!prefs.weekly_enabled) {
    return { sent: 0, skipped: 0, failed: 0, reason: "disabled" };
  }

  if (dayOfWeekSundayZero(local.isoDay) !== prefs.weekly_day) {
    return { sent: 0, skipped: 0, failed: 0, reason: "wrong_weekday" };
  }

  const weekStart = startOfWeekMonday(local.isoDay);
  const weekEnd = endOfWeekSunday(local.isoDay);
  const weekKey = isoWeekKey(local.isoDay);

  const { data: entries, error } = await db
    .from(T_ENTRIES)
    .select("day")
    .gte("day", weekStart)
    .lte("day", weekEnd);

  if (error) throw error;

  const count = entries?.length ?? 0;

  let body = "Want to restart the record?";
  if (count >= 5) {
    body = "Your week is ready to review.";
  } else if (count >= 1) {
    body = "You captured part of the week.";
  }

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "weekly_reflection",
      logicalWeek: weekKey,
      payload: {
        title: "Verum",
        body,
        url: "/?tab=record",
        tag: `verum-weekly-${weekKey}`,
        type: "weekly_reflection",
      },
      meta: {
        timezone: prefs.timezone,
        weekStart,
        weekEnd,
        entryCount: count,
      },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts, count, weekKey };
}
