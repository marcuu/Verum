import { sendLoggedNotification } from "../delivery";
import { dayOfMonth, monthKey } from "../month";
import type { JobContext, JobResult } from "../types";

// R5 monthly backup: a quiet reminder to export your own copy of the journal.
export async function runMonthlyBackup({
  prefs,
  local,
  subs,
}: JobContext): Promise<JobResult> {
  if (!prefs.backup_enabled) {
    return { sent: 0, skipped: 0, failed: 0, reason: "disabled" };
  }

  if (dayOfMonth(local.isoDay) !== prefs.backup_day_of_month) {
    return { sent: 0, skipped: 0, failed: 0, reason: "wrong_day" };
  }

  const month = monthKey(local.isoDay);
  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "monthly_backup",
      logicalMonth: month,
      payload: {
        title: "Verum",
        body: "Keep your own copy of Verum?",
        url: "/?export=1",
        tag: `verum-backup-${month}`,
        type: "monthly_backup",
      },
      meta: { timezone: prefs.timezone, month },
    });

    counts[delivery.status] += 1;
  }

  return { ...counts, month };
}
