import { describe, it, expect } from "vitest";
import {
  utcDay,
  utcTs,
  isValidDayString,
  isPlausibleEntryDay,
} from "@/lib/dates";

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

describe("isValidDayString", () => {
  it("accepts real calendar dates", () => {
    expect(isValidDayString("2026-07-03")).toBe(true);
    expect(isValidDayString("2024-02-29")).toBe(true); // leap day
  });

  it("rejects malformed strings", () => {
    expect(isValidDayString("banana")).toBe(false);
    expect(isValidDayString("2026-7-3")).toBe(false);
    expect(isValidDayString("2026-07-03T00:00:00Z")).toBe(false);
    expect(isValidDayString("")).toBe(false);
    expect(isValidDayString(undefined)).toBe(false);
    expect(isValidDayString(20260703 as unknown)).toBe(false);
  });

  it("rejects impossible calendar dates that match the shape", () => {
    expect(isValidDayString("2026-02-31")).toBe(false);
    expect(isValidDayString("2026-13-01")).toBe(false);
    expect(isValidDayString("2025-02-29")).toBe(false); // not a leap year
  });
});

describe("isPlausibleEntryDay", () => {
  const now = new Date("2026-07-03T12:00:00Z");

  it("accepts today, the recent past, and near-future clock skew", () => {
    expect(isPlausibleEntryDay("2026-07-03", now)).toBe(true);
    expect(isPlausibleEntryDay("2026-07-02", now)).toBe(true);
    expect(isPlausibleEntryDay("1994-01-01", now)).toBe(true);
    expect(isPlausibleEntryDay("2026-07-04", now)).toBe(true); // device ahead of tz
  });

  it("rejects the far future and the pre-journal era", () => {
    expect(isPlausibleEntryDay("2026-08-01", now)).toBe(false);
    expect(isPlausibleEntryDay("0099-01-01", now)).toBe(false);
    expect(isPlausibleEntryDay("1899-12-31", now)).toBe(false);
  });

  it("rejects anything the day validator rejects", () => {
    expect(isPlausibleEntryDay("2026-02-31", now)).toBe(false);
    expect(isPlausibleEntryDay("banana", now)).toBe(false);
  });
});
