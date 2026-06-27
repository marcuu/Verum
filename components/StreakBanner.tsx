"use client";

import type { Streak } from "@/lib/types";

// Prominent consecutive-day signal, shown above the entry input.
// - "Logged today"   once today's entry is saved.
// - "Streak at risk" while today has no entry yet but the streak is alive.
// - "Start a streak" when there is no active streak.
export default function StreakBanner({ streak }: { streak: Streak | null }) {
  if (!streak) return null;

  const { current, best, loggedToday } = streak;
  const active = current > 0;

  let state: "logged" | "risk" | "none";
  let copy: string;
  if (loggedToday) {
    state = "logged";
    copy = "Logged today";
  } else if (active) {
    state = "risk";
    copy = "Streak at risk — write today";
  } else {
    state = "none";
    copy = "Start a streak — write today";
  }

  const dayLabel = current === 1 ? "day" : "days";

  return (
    <div
      className={"streak streak-" + state}
      role="status"
      aria-label={`Current streak ${current} ${dayLabel}. ${copy}.`}
    >
      <span className="streak-count">
        <span className="streak-flame" aria-hidden="true">
          🔥
        </span>
        <span className="streak-num">{current}</span>{" "}
        <span className="streak-unit">{dayLabel}</span>
      </span>
      <span className="streak-copy">{copy}</span>
      {best > 0 && (
        <span className="streak-best" title="Longest streak so far">
          best {best}
        </span>
      )}
    </div>
  );
}
