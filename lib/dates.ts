// Date helpers shared across API routes.
//
// Day semantics: a journal "day" is the day the owner lived, not the UTC
// date. Server routes that need "today" use localDay() in the app timezone
// (APP_TIMEZONE, default Europe/London — the same timezone the notification
// cron schedules against). Timestamps (created_at/updated_at) stay UTC.

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/London";

export function utcTs(): string {
  return new Date().toISOString();
}

export function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Today's calendar date in the app timezone. en-CA formats as YYYY-MM-DD.
export function localDay(date = new Date(), timezone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Strict YYYY-MM-DD with a real calendar date behind it (rejects 2026-02-31).
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDayString(day: unknown): day is string {
  if (typeof day !== "string" || !DAY_RE.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

// A day a journal entry could plausibly belong to: valid, not before the
// journal's era, and not in the future. Two days of headroom past the
// server-timezone "today" absorbs device clocks living ahead of APP_TIMEZONE.
export function isPlausibleEntryDay(day: unknown, now = new Date()): boolean {
  if (!isValidDayString(day)) return false;
  const upper = localDay(new Date(now.getTime() + 2 * 86_400_000));
  return day >= "1900-01-01" && day <= upper;
}
