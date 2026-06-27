// Week math for the weekly reflection. Operates on date-only isoDay strings.

function parseIsoDay(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday (matches the weekly_day preference convention).
export function dayOfWeekSundayZero(isoDay: string): number {
  return parseIsoDay(isoDay).getUTCDay();
}

export function startOfWeekMonday(isoDay: string): string {
  const date = parseIsoDay(isoDay);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatIsoDay(date);
}

export function endOfWeekSunday(isoDay: string): string {
  const start = parseIsoDay(startOfWeekMonday(isoDay));
  start.setUTCDate(start.getUTCDate() + 6);
  return formatIsoDay(start);
}

// ISO-8601 week key, e.g. "2026-W26". Used as the weekly dedupe period.
export function isoWeekKey(isoDay: string): string {
  const date = parseIsoDay(isoDay);

  // Thursday determines the ISO week-year.
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
