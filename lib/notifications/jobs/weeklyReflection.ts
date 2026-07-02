import { T_ENTRIES } from "@/lib/constants";
import { sendLoggedNotification } from "../delivery";
import {
  dayOfWeekSundayZero,
  endOfWeekSunday,
  isoWeekKey,
  startOfWeekMonday,
} from "../week";
import { excerpt, pickResonantEntry, shiftYears } from "../reflection";
import type { JobContext, JobResult } from "../types";

// R4 weekly reflection: a once-a-week prompt to review the record. Sends even
// with zero entries — the point is to nudge reflection or a restart. When the
// record has something to say, it says it in the owner's own words: the most
// substantial entry from this week last year resurfaces as the message.
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

  // Resonance first: this week last year, in the owner's own words.
  const lastYearStart = shiftYears(weekStart, -1);
  const lastYearEnd = shiftYears(weekEnd, -1);
  const { data: lastYear, error: lastYearError } = await db
    .from(T_ENTRIES)
    .select("day, text")
    .gte("day", lastYearStart)
    .lte("day", lastYearEnd);

  if (lastYearError) throw lastYearError;

  const resonant = pickResonantEntry(lastYear ?? []);

  let body = "Want to restart the record?";
  if (resonant) {
    body = `A year ago this week: “${excerpt(resonant.text)}”`;
  } else if (count >= 5) {
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
        url: "/?tab=journal",
        tag: `verum-weekly-${weekKey}`,
        type: "weekly_reflection",
      },
      meta: {
        timezone: prefs.timezone,
        weekStart,
        weekEnd,
        entryCount: count,
        resonantDay: resonant?.day ?? null,
      },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts, count, weekKey };
}
