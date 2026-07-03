import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalParts } from "./schedule";

export type NotificationType =
  | "daily_reminder"
  | "streak_rescue"
  | "weekly_reflection"
  | "monthly_backup"
  // The system paging its owner: a cron job threw. Verum's own push channel
  // is the alerting stack — there is no other pager for a single-user app.
  | "system_alert";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  type: NotificationType | "test";
  // When true, the service worker pins the notification on screen (and
  // vibrates) instead of letting it auto-dismiss — the client half of a
  // priority alert. Paired with a high Urgency header on delivery.
  requireInteraction?: boolean;
};

// Web Push urgency, per RFC 8030 §5.3. "high" tells the push service to wake
// the device and deliver immediately rather than batching for battery.
export type PushUrgency = "very-low" | "low" | "normal" | "high";

// Time-sensitive notifications that should arrive as priority alerts: delivered
// immediately (high Urgency) and pinned on screen until acknowledged. Reflective
// nudges (weekly/monthly) stay at normal urgency and auto-dismiss.
export const PRIORITY_NOTIFICATION_TYPES = new Set<NotificationType>([
  "daily_reminder",
  "streak_rescue",
  "system_alert",
]);

export type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number | null;
};

export type PreferencesRow = {
  timezone: string;
  daily_enabled: boolean;
  daily_time: string;
  rescue_enabled: boolean;
  rescue_time: string;
  rescue_min_streak: number;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_time: string;
  backup_enabled: boolean;
  backup_day_of_month: number;
  backup_time: string;
};

// Shared context handed to every cron job runner.
export type JobContext = {
  db: SupabaseClient;
  prefs: PreferencesRow;
  local: LocalParts;
  subs: SubscriptionRow[];
};

export type JobResult = {
  sent: number;
  skipped: number;
  failed: number;
  reason?: string;
  [key: string]: unknown;
};
