import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocalParts } from "./schedule";

export type NotificationType =
  | "daily_reminder"
  | "streak_rescue"
  | "weekly_reflection"
  | "monthly_backup";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  type: NotificationType | "test";
};

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
