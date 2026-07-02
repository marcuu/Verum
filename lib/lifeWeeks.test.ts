import { describe, it, expect } from "vitest";
import {
  ageYearRange,
  ageYearWeeks,
  birthdayWindow,
  currentAge,
  lastClosedAge,
} from "@/lib/lifeWeeks";

const DOB = "1993-12-19";

describe("currentAge", () => {
  it("counts completed years only", () => {
    expect(currentAge(DOB, "2026-07-02")).toBe(32);
    expect(currentAge(DOB, "2026-12-18")).toBe(32);
    expect(currentAge(DOB, "2026-12-19")).toBe(33); // birthday itself
  });

  it("is zero before the first birthday", () => {
    expect(currentAge(DOB, "1994-06-01")).toBe(0);
  });
});

describe("ageYearRange", () => {
  it("runs birthday to the day before the next", () => {
    expect(ageYearRange(DOB, 32)).toEqual({
      start: "2025-12-19",
      end: "2026-12-18",
    });
  });

  it("age 0 starts at birth", () => {
    expect(ageYearRange(DOB, 0)).toEqual({
      start: "1993-12-19",
      end: "1994-12-18",
    });
  });
});

describe("lastClosedAge", () => {
  it("is the row before the current one", () => {
    expect(lastClosedAge(DOB, "2026-07-02")).toBe(31);
  });

  it("is null before the first birthday", () => {
    expect(lastClosedAge(DOB, "1994-06-01")).toBeNull();
  });
});

describe("birthdayWindow", () => {
  it("opens on the birthday with the just-closed row", () => {
    expect(birthdayWindow(DOB, "2026-12-19")).toEqual({
      active: true,
      closedAge: 32,
    });
  });

  it("stays open for the configured days", () => {
    expect(birthdayWindow(DOB, "2026-12-25").active).toBe(true);
    expect(birthdayWindow(DOB, "2026-12-26").active).toBe(false);
  });

  it("is closed in mid-year", () => {
    expect(birthdayWindow(DOB, "2026-07-02")).toEqual({
      active: false,
      closedAge: null,
    });
  });
});

describe("ageYearWeeks", () => {
  it("yields 52 or 53 Mondays with consecutive absolute indices", () => {
    const weeks = ageYearWeeks(DOB, 32);
    expect(weeks.length === 52 || weeks.length === 53).toBe(true);
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i].absoluteIndex).toBe(weeks[i - 1].absoluteIndex + 1);
    }
  });

  it("adjacent age-years don't share weeks", () => {
    const a = ageYearWeeks(DOB, 31);
    const b = ageYearWeeks(DOB, 32);
    expect(b[0].absoluteIndex).toBe(a[a.length - 1].absoluteIndex + 1);
  });

  it("age 0 starts at absolute week 0", () => {
    expect(ageYearWeeks(DOB, 0)[0].absoluteIndex).toBe(0);
  });
});
