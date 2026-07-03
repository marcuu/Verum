// Shared between the capture UI and the daily reminder notification body.
export const CAPTURE_PROMPT = "What happened today?";

// Streak display threshold and grace-day forgiveness model (§5.6).
// Plain numbers so they're importable in both client and server bundles.
export const STREAK_THRESHOLD = 3;   // hide streak below this
export const STREAK_GRACE_DAYS = 1;  // max missed days per rolling window
export const STREAK_GRACE_WINDOW = 7; // window size in calendar days

// Entries are unbounded prose, but not unbounded payloads: a cap well above
// any real journal day keeps a bad client from storing megabytes per row.
export const MAX_ENTRY_CHARS = 64_000;

// Server-only config derived from environment variables.

// A mistyped env value must fall back, not propagate NaN into SQL params.
function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    console.warn(`[verum] ${name}="${raw}" is not a number; using ${fallback}`);
    return fallback;
  }
  return n;
}

export const CORE_THRESHOLD = intFromEnv("QUOTES_CORE_THRESHOLD", 3);

export const AVOID_DAYS = intFromEnv("QUOTES_AVOID_DAYS", 14);

// Table names (verum_ prefixed, co-located in the public schema).
export const T_ENTRIES = "verum_entries";
export const T_QUOTES = "verum_quotes";
export const T_DAILY_PICK = "verum_quotes_daily_pick";
export const T_LIFE_MARKERS = "verum_life_markers";
export const T_NOTIFICATION_PREFERENCES = "verum_notification_preferences";
export const T_NOTIFICATION_SUBSCRIPTIONS = "verum_notification_subscriptions";
export const T_NOTIFICATION_DELIVERIES = "verum_notification_deliveries";

export const isCore = (score: number) => score >= CORE_THRESHOLD;
