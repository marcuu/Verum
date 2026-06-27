import { T_ENTRIES } from "@/lib/constants";
import { sendLoggedNotification } from "../delivery";
import type { JobContext, JobResult } from "../types";

// R2 daily reminder: one nudge if reminders are on and today has no entry.
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

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "daily_reminder",
      logicalDay: local.isoDay,
      payload: {
        title: "Verum",
        body: "What happened today?",
        url: "/",
        tag: `verum-daily-${local.isoDay}`,
        type: "daily_reminder",
      },
      meta: { timezone: prefs.timezone },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts };
}
