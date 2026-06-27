// Server-safe streak math for notifications. Date-only, dependency-light —
// operates on the local isoDay strings passed in, not the current timestamp.

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function addDays(day: string, delta: number): string {
  const d = toDate(day);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function previousDay(isoDay: string): string {
  return addDays(isoDay, -1);
}

// Counts consecutive entry days ending on (and including) endDay, walking
// backwards. For streak rescue, pass yesterday — today is intentionally missing.
export function computeStreakEndingOn(
  entryDays: string[],
  endDay: string
): number {
  const days = new Set(entryDays);
  let cursor = endDay;
  let count = 0;

  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}
