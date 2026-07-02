import { CAPTURE_PROMPT, T_ENTRIES } from "@/lib/constants";
import { sendLoggedNotification } from "../delivery";
import { excerpt, lastLineOf, shiftDays } from "../reflection";
import type { JobContext, JobResult } from "../types";

// R2 daily reminder: one nudge if reminders are on and today has no entry.
// When yesterday was written, the reminder speaks in the owner's own voice —
// continuity, not a nag. Falls back to the calm prompt for gaps (a reminder
// after missed days should not lead with the absence).
export async function runDailyReminder({
  db,
  prefs,
  local,
  subs,
}: JobContext): Promise<JobResult> {
  if (!prefs.daily_enabled) {
    return { sent: 0, skipped: 0, failed: 0, reason: "disabled" };
  }

  const { data: todayEntry, error } = await db
    .from(T_ENTRIES)
    .select("day")
    .eq("day", local.isoDay)
    .maybeSingle();

  if (error) throw error;

  if (todayEntry) {
    return { sent: 0, skipped: 0, failed: 0, reason: "already_logged" };
  }

  const yesterdayDay = shiftDays(local.isoDay, -1);
  const { data: yesterdayEntry, error: yError } = await db
    .from(T_ENTRIES)
    .select("text")
    .eq("day", yesterdayDay)
    .maybeSingle();

  if (yError) throw yError;

  const closing = yesterdayEntry ? lastLineOf(yesterdayEntry.text) : "";
  const body = closing
    ? `Yesterday: “${excerpt(closing, 70)}” — and today?`
    : CAPTURE_PROMPT;

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "daily_reminder",
      logicalDay: local.isoDay,
      payload: {
        title: "Verum",
        body,
        url: "/",
        tag: `verum-daily-${local.isoDay}`,
        type: "daily_reminder",
      },
      meta: { timezone: prefs.timezone, ownVoice: !!closing },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts };
}
