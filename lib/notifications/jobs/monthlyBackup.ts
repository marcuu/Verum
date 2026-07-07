import { runBackupToStorage } from "@/lib/backup";
import { sendLoggedNotification } from "../delivery";
import { dayOfMonth, monthKey } from "../month";
import type { JobContext, JobResult } from "../types";

// R5 monthly backup. Originally a reminder to export by hand; now the job
// performs the backup itself (JSON snapshot into the private verum-backups
// Storage bucket) and the notification reports the outcome. The human is out
// of the loop; the push is a receipt, not a chore.
export async function runMonthlyBackup({
  db,
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

  let backup: Awaited<ReturnType<typeof runBackupToStorage>> | null = null;
  let backupError: string | null = null;
  try {
    backup = await runBackupToStorage(db, month);
  } catch (err) {
    backupError = (err as { message?: string })?.message ?? String(err);
    console.error("[verum] backup.monthly:", err);
  }

  // A failed backup is the one monthly message that must not auto-dismiss —
  // it means the record is only as safe as the last snapshot.
  const body = backup
    ? `Backed up ${backup.counts.entries} entries to storage${
        backup.encrypted ? ", encrypted" : ""
      }.`
    : "Automatic backup failed — export a copy manually?";

  const counts = { sent: 0, skipped: 0, failed: 0 };

  for (const sub of subs) {
    const delivery = await sendLoggedNotification({
      subscription: sub,
      notificationType: "monthly_backup",
      logicalMonth: month,
      payload: {
        title: "Verum",
        body,
        url: backup ? "/?tab=reminders" : "/?export=1",
        tag: `verum-backup-${month}`,
        type: "monthly_backup",
        requireInteraction: !backup,
      },
      meta: {
        timezone: prefs.timezone,
        month,
        backup: backup ?? undefined,
        backupError: backupError ?? undefined,
      },
    });

    counts[delivery.status] += 1;
  }

  return {
    ...counts,
    month,
    backup: backup ?? undefined,
    backupError: backupError ?? undefined,
  };
}
