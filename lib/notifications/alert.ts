import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLoggedNotification } from "./delivery";
import type { SubscriptionRow } from "./types";

// TD-2: when a cron job fails, the system pages its owner over the app's own
// push channel — otherwise a 500 in a scheduled function is invisible until
// someone notices reminders went quiet.
//
// Deduped per logical day via the existing (subscription, type, logical_day)
// unique guard: one alert per day no matter how many jobs fail or how often
// the cron retries. The failing job's name still lands in the delivery log's
// meta, so the history panel shows what broke.
export async function sendSystemAlert(options: {
  db: SupabaseClient;
  subs: SubscriptionRow[];
  job: string;
  isoDay: string;
  error: string;
}): Promise<void> {
  for (const sub of options.subs) {
    try {
      await sendLoggedNotification({
        subscription: sub,
        notificationType: "system_alert",
        logicalDay: options.isoDay,
        payload: {
          title: "Verum",
          body: `Something broke behind the scenes (${options.job} job). Check the delivery history.`,
          url: "/?tab=reminders",
          tag: `verum-alert-${options.isoDay}`,
          type: "system_alert",
        },
        meta: { job: options.job, error: options.error },
      });
    } catch (err) {
      // Alerting is best-effort by definition; the original failure is
      // already in the logs and must remain the error that surfaces.
      console.error("[verum] notifications.alert:", err);
    }
  }
}
