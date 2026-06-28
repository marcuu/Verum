"use client";

import { STREAK_THRESHOLD } from "@/lib/constants";
import type { StreakInfo } from "@/lib/streak";

export default function StreakBanner({ streak }: { streak: StreakInfo | null }) {
  if (!streak) return null;
  const { current, loggedToday } = streak;

  // Below threshold: show only the completion tick (if logged), never the
  // streak number. A 1- or 2-day run doesn't need a counter; showing "1 day"
  // mainly advertises fragility.
  if (current < STREAK_THRESHOLD) {
    if (!loggedToday) return null;
    return (
      <div className="streak logged" role="status" aria-label="Logged today">
        <span className="streak-state">✓ logged today</span>
      </div>
    );
  }

  // At or above threshold: the streak number is the single status signal.
  // "logged today" is redundant here — the streak implies it.
  const dayLabel = current === 1 ? "day" : "days";
  return (
    <div
      className={"streak" + (loggedToday ? " logged" : "")}
      role="status"
      aria-label={`${current} ${dayLabel} streak`}
    >
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <span>
        <span className="streak-num">{current}</span>{" "}
        {dayLabel}
      </span>
    </div>
  );
}
