import { describe, it, expect } from "vitest";
import { excerpt, pickResonantEntry, shiftYears } from "@/lib/notifications/reflection";

describe("shiftYears", () => {
  it("moves a plain date back a year", () => {
    expect(shiftYears("2026-07-02", -1)).toBe("2025-07-02");
  });

  it("moves forward too", () => {
    expect(shiftYears("2025-12-31", 1)).toBe("2026-12-31");
  });

  it("resolves Feb 29 to Mar 1 on non-leap years", () => {
    expect(shiftYears("2024-02-29", 1)).toBe("2025-03-01");
  });
});

describe("excerpt", () => {
  it("returns short text unchanged", () => {
    expect(excerpt("A quiet day.")).toBe("A quiet day.");
  });

  it("collapses whitespace and newlines", () => {
    expect(excerpt("two\n  lines   here")).toBe("two lines here");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const long =
      "Walked the coast path in the morning fog and watched the tide pull the light out of the bay before breakfast even started";
    const out = excerpt(long, 60);
    expect(out.length).toBeLessThanOrEqual(61);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/); // no dangling space before the ellipsis
  });

  it("hard-cuts when there is no usable word boundary", () => {
    const out = excerpt("a".repeat(200), 50);
    expect(out).toBe("a".repeat(50) + "…");
  });
});

describe("pickResonantEntry", () => {
  it("returns null for empty or blank-only weeks", () => {
    expect(pickResonantEntry([])).toBeNull();
    expect(pickResonantEntry([{ day: "2025-07-01", text: "   " }])).toBeNull();
  });

  it("prefers the most substantial entry", () => {
    const picked = pickResonantEntry([
      { day: "2025-06-30", text: "Short." },
      { day: "2025-07-01", text: "A much longer entry with real texture to it." },
      { day: "2025-07-02", text: "Mid-length note here." },
    ]);
    expect(picked?.day).toBe("2025-07-01");
  });

  it("breaks length ties toward the earlier day", () => {
    const picked = pickResonantEntry([
      { day: "2025-07-02", text: "Same size" },
      { day: "2025-07-01", text: "Same size" },
    ]);
    expect(picked?.day).toBe("2025-07-01");
  });

  it("trims the winning text", () => {
    const picked = pickResonantEntry([{ day: "2025-07-01", text: "  kept  " }]);
    expect(picked?.text).toBe("kept");
  });
});
