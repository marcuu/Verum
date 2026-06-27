// Streak math over journal days (YYYY-MM-DD, UTC).
//
// current: length of the consecutive run of days ending today, or ending
//          yesterday (a streak stays "alive" until the end of today even if
//          today has no entry yet).
// best:    longest consecutive run ever recorded.

export type StreakInfo = {
  current: number;
  best: number;
  loggedToday: boolean;
  lastDay: string | null;
};

// Previous calendar day in UTC, returned as YYYY-MM-DD.
function prevDayUTC(iso: string): string {
  const [Y, M, D] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(Y, M - 1, D));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function computeStreak(days: Iterable<string>, today: string): StreakInfo {
  const set = new Set<string>();
  for (const d of days) {
    if (d) set.add(d);
  }

  // Current streak: anchor on today if present, else yesterday, then walk back.
  const yesterday = prevDayUTC(today);
  let cursor: string | null = set.has(today)
    ? today
    : set.has(yesterday)
    ? yesterday
    : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current++;
    cursor = prevDayUTC(cursor);
  }

  // Best streak: scan unique days in ascending order, counting runs.
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && prevDayUTC(d) === prev ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  return {
    current,
    best,
    loggedToday: set.has(today),
    lastDay: sorted.length ? sorted[sorted.length - 1] : null,
  };
}
