// Streak math over journal days (YYYY-MM-DD, UTC).
//
// current: actual logged days in the run ending today/yesterday, with
//          grace-day forgiveness (1 missed day per rolling 7-day window
//          keeps the run alive without counting in the streak total).
// best:    longest such run ever recorded.
//
// The grace-day window means two consecutive missed days (or two gaps in
// any 7-day span) reset the streak; a single isolated missed day does not.

import { STREAK_GRACE_DAYS, STREAK_GRACE_WINDOW } from "@/lib/constants";

export type StreakInfo = {
  current: number;        // logged days in the current grace-day run
  best: number;           // longest grace-day run ever
  loggedToday: boolean;   // has today's entry?
  lastDay: string | null; // most recently logged day
};

function prevDayUTC(iso: string): string {
  const [Y, M, D] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(Y, M - 1, D));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

// Walk backward from `anchor`, counting days that have entries.
// Up to STREAK_GRACE_DAYS missed days per STREAK_GRACE_WINDOW-day rolling
// window are tolerated without breaking the run.
function graceRun(set: Set<string>, anchor: string): number {
  let count = 0;
  let cursor = anchor;
  let gapsInWindow = 0;
  const win: boolean[] = [];

  for (let i = 0; i < 400; i++) {
    const has = set.has(cursor);
    win.push(has);
    if (win.length > STREAK_GRACE_WINDOW) {
      const removed = win.shift()!;
      if (!removed) gapsInWindow--;
    }
    if (!has) {
      gapsInWindow++;
      if (gapsInWindow > STREAK_GRACE_DAYS) break;
      // Grace: run continues, day not counted.
    } else {
      count++;
    }
    cursor = prevDayUTC(cursor);
  }
  return count;
}

export function computeStreak(days: Iterable<string>, today: string): StreakInfo {
  const set = new Set<string>();
  for (const d of days) if (d) set.add(d);

  const yesterday = prevDayUTC(today);
  const sorted = [...set].sort();

  // ── Current streak ────────────────────────────────────────────────────────
  // Anchor on today if logged, else yesterday (streak alive until end of day).
  const anchor: string | null = set.has(today)
    ? today
    : set.has(yesterday)
    ? yesterday
    : null;
  const current = anchor ? graceRun(set, anchor) : 0;

  // ── Best streak (forward pass with same grace model) ──────────────────────
  let best = 0;
  let run = 0;
  let gapsBest = 0;
  const winBest: boolean[] = [];
  let prevSorted: string | null = null;

  for (const d of sorted) {
    if (prevSorted !== null) {
      const gap = daysBetween(prevSorted, d) - 1; // calendar days between entries
      let broken = false;
      for (let g = 0; g < gap; g++) {
        winBest.push(false);
        if (winBest.length > STREAK_GRACE_WINDOW) {
          const removed = winBest.shift()!;
          if (!removed) gapsBest--;
        }
        gapsBest++;
        if (gapsBest > STREAK_GRACE_DAYS) {
          run = 0;
          gapsBest = 0;
          winBest.length = 0;
          broken = true;
          break;
        }
      }
      void broken; // gap-loop already handled reset; continue to count `d`
    }
    winBest.push(true);
    if (winBest.length > STREAK_GRACE_WINDOW) {
      const removed = winBest.shift()!;
      if (!removed) gapsBest--;
    }
    run++;
    if (run > best) best = run;
    prevSorted = d;
  }

  return {
    current,
    best,
    loggedToday: set.has(today),
    lastDay: sorted.length ? sorted[sorted.length - 1] : null,
  };
}
