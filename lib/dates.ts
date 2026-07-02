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
