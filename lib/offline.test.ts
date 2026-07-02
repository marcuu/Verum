import { describe, it, expect } from "vitest";
import {
  queuePendingEntry,
  listPendingEntries,
  clearPendingEntry,
  hasPendingEntries,
} from "@/lib/offline";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("offline pending-entry queue", () => {
  it("starts empty", () => {
    const s = memoryStorage();
    expect(listPendingEntries(s)).toEqual([]);
    expect(hasPendingEntries(s)).toBe(false);
  });

  it("queues and lists an entry", () => {
    const s = memoryStorage();
    expect(queuePendingEntry("2026-07-02", "A day offline.", s)).toBe(true);
    const list = listPendingEntries(s);
    expect(list).toHaveLength(1);
    expect(list[0].day).toBe("2026-07-02");
    expect(list[0].text).toBe("A day offline.");
  });

  it("collapses repeated saves of the same day to the latest text", () => {
    const s = memoryStorage();
    queuePendingEntry("2026-07-02", "first", s);
    queuePendingEntry("2026-07-02", "second, fuller thought", s);
    const list = listPendingEntries(s);
    expect(list).toHaveLength(1);
    expect(list[0].text).toBe("second, fuller thought");
  });

  it("lists a multi-day stretch oldest first", () => {
    const s = memoryStorage();
    queuePendingEntry("2026-07-02", "later", s);
    queuePendingEntry("2026-07-01", "earlier", s);
    expect(listPendingEntries(s).map((e) => e.day)).toEqual([
      "2026-07-01",
      "2026-07-02",
    ]);
  });

  it("clears one day without touching the rest", () => {
    const s = memoryStorage();
    queuePendingEntry("2026-07-01", "a", s);
    queuePendingEntry("2026-07-02", "b", s);
    clearPendingEntry("2026-07-01", s);
    expect(listPendingEntries(s).map((e) => e.day)).toEqual(["2026-07-02"]);
  });

  it("removes the storage key when the last entry clears", () => {
    const s = memoryStorage();
    queuePendingEntry("2026-07-02", "only", s);
    clearPendingEntry("2026-07-02", s);
    expect(s.getItem("verum-pending-entries")).toBeNull();
  });

  it("survives corrupted storage contents", () => {
    const s = memoryStorage();
    s.setItem("verum-pending-entries", "{not json");
    expect(listPendingEntries(s)).toEqual([]);
    expect(queuePendingEntry("2026-07-02", "recovers", s)).toBe(true);
    expect(listPendingEntries(s)).toHaveLength(1);
  });

  it("degrades gracefully with no storage at all", () => {
    expect(queuePendingEntry("2026-07-02", "x", null)).toBe(false);
    expect(listPendingEntries(null)).toEqual([]);
    expect(hasPendingEntries(null)).toBe(false);
  });
});
