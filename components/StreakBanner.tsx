"use client";

import type { StreakInfo } from "@/lib/streak";

export default function StreakBanner({ streak }: { streak: StreakInfo | null }) {
  if (!streak || streak.current === 0) return null;
  const { current, loggedToday } = streak;
  const dayLabel = current === 1 ? "day" : "days";
  const stateText = loggedToday ? "logged today" : "not yet today";

  return (
    <div
      className={"streak" + (loggedToday ? " logged" : "")}
      role="status"
      aria-label={`Streak: ${current} ${dayLabel}. ${stateText}.`}
    >
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <span>
        <span className="streak-num">{current}</span> {dayLabel}
      </span>
      <span aria-hidden="true">·</span>
      <span className="streak-state">{stateText}</span>
    </div>
  );
}
