import { describe, it, expect } from "vitest";
import { computeStreak } from "@/lib/streak";

// Grace model under test: STREAK_GRACE_DAYS = 1 per STREAK_GRACE_WINDOW = 7.
// A single isolated missed day keeps the run alive (but isn't counted);
// two missed days inside any 7-day span reset it.

const TODAY = "2026-07-02";

describe("computeStreak", () => {
  it("returns zeros for no entries", () => {
    const s = computeStreak([], TODAY);
    expect(s).toEqual({ current: 0, best: 0, loggedToday: false, lastDay: null });
  });

  it("counts a lone entry logged today", () => {
    const s = computeStreak([TODAY], TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.loggedToday).toBe(true);
    expect(s.lastDay).toBe(TODAY);
  });

  it("counts a consecutive run ending today", () => {
    const s = computeStreak(["2026-06-30", "2026-07-01", "2026-07-02"], TODAY);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.loggedToday).toBe(true);
  });

  it("keeps the run anchored on yesterday when today isn't logged yet", () => {
    const s = computeStreak(["2026-07-01"], TODAY);
    expect(s.current).toBe(1);
    expect(s.loggedToday).toBe(false);
  });

  it("forgives a single missed day inside the run", () => {
    // 06-30 is missing, but that's one gap in the window — run survives.
    const s = computeStreak(
      ["2026-06-28", "2026-06-29", "2026-07-01", "2026-07-02"],
      TODAY
    );
    expect(s.current).toBe(4); // four logged days; the gap isn't counted
    expect(s.best).toBe(4);
  });

  it("breaks the current run on two missed days in a window", () => {
    // 06-30 and 07-01 both missing -> two gaps -> current run is just today,
    // while the earlier pair remains the best run on record.
    const s = computeStreak(
      ["2026-06-28", "2026-06-29", "2026-07-02"],
      TODAY
    );
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
    expect(s.loggedToday).toBe(true);
    expect(s.lastDay).toBe("2026-07-02");
  });

  it("reports today not logged while still tracking the last day", () => {
    const s = computeStreak(["2026-06-20", "2026-06-21"], TODAY);
    expect(s.loggedToday).toBe(false);
    expect(s.current).toBe(0); // neither today nor yesterday logged
    expect(s.best).toBe(2);
    expect(s.lastDay).toBe("2026-06-21");
  });

  it("is order-independent and ignores duplicates and blanks", () => {
    const s = computeStreak(
      ["2026-07-02", "2026-06-30", "2026-07-01", "2026-07-02", ""],
      TODAY
    );
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.lastDay).toBe("2026-07-02");
  });
});
