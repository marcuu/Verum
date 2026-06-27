"use client";

import type { StreakInfo } from "@/lib/streak";

export default function StreakBanner({ streak }: { streak: StreakInfo | null }) {
  if (!streak) return null;
  const { current, loggedToday } = streak;
  const dayLabel = current === 1 ? "day" : "days";
  const stateText = loggedToday ? "Logged ✓" : "Not logged today";

  return (
    <div
      className={"streak-strip" + (loggedToday ? " streak-strip-logged" : "")}
      role="status"
      aria-label={`Streak: ${current} ${dayLabel}. ${stateText}.`}
    >
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <span className="streak-num">{current}</span>
      <span className="streak-unit">{dayLabel}</span>
      <span className="streak-sep" aria-hidden="true">·</span>
      <span className="streak-state">{stateText}</span>
    </div>
  );
}
