import { describe, it, expect } from "vitest";
import { utcDay, utcTs } from "@/lib/dates";

describe("date helpers", () => {
  it("utcDay is a YYYY-MM-DD string", () => {
    expect(utcDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("utcTs is a full ISO-8601 timestamp", () => {
    expect(utcTs()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });

  it("utcDay is the date portion of utcTs", () => {
    // Same wall-clock instant modulo the microseconds between the two calls;
    // the day only differs on the rare midnight-boundary tick.
    expect(utcTs().slice(0, 10)).toBe(utcDay());
  });
});
