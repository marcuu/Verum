import { describe, it, expect } from "vitest";
import { entriesToMarkdown } from "@/lib/exportMarkdown";

const ON = "2026-07-02";

describe("entriesToMarkdown", () => {
  it("renders an empty archive honestly", () => {
    const md = entriesToMarkdown([], ON);
    expect(md).toContain("# Verum — journal archive");
    expect(md).toContain("0 entries · empty");
  });

  it("renders one entry with a readable heading", () => {
    const md = entriesToMarkdown([{ day: "2026-07-01", text: "A calm day." }], ON);
    expect(md).toContain("1 entry · 2026-07-01 → 2026-07-01");
    expect(md).toContain("## 2026");
    expect(md).toContain("### Wednesday, 1 July 2026");
    expect(md).toContain("A calm day.");
  });

  it("sorts oldest-first and chapters by year", () => {
    const md = entriesToMarkdown(
      [
        { day: "2026-01-02", text: "second year" },
        { day: "2025-12-31", text: "first year" },
      ],
      ON
    );
    const y2025 = md.indexOf("## 2025");
    const y2026 = md.indexOf("## 2026");
    expect(y2025).toBeGreaterThan(-1);
    expect(y2026).toBeGreaterThan(y2025);
    expect(md.indexOf("first year")).toBeLessThan(md.indexOf("second year"));
    expect(md).toContain("2025-12-31 → 2026-01-02");
  });

  it("emits one year chapter per year, not per entry", () => {
    const md = entriesToMarkdown(
      [
        { day: "2026-07-01", text: "a" },
        { day: "2026-07-02", text: "b" },
      ],
      ON
    );
    expect(md.match(/^## 2026$/gm)).toHaveLength(1);
  });

  it("keeps multi-line entry text intact", () => {
    const md = entriesToMarkdown(
      [{ day: "2026-07-01", text: "line one\nline two" }],
      ON
    );
    expect(md).toContain("line one\nline two");
  });
});
