import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import { computeStreak } from "../lib/streak";
import {
  computeStreakEndingOn,
  previousDay,
} from "../lib/notifications/streak";
import {
  dayOfWeekSundayZero,
  endOfWeekSunday,
  isoWeekKey,
  startOfWeekMonday,
} from "../lib/notifications/week";
import { dayOfMonth, monthKey } from "../lib/notifications/month";
import {
  isWithinWindow,
  localParts,
} from "../lib/notifications/schedule";
import { urlBase64ToUint8Array } from "../lib/notifications/client";
import { safeNextPath } from "../lib/navigation";
import { parseIntegerSetting, parseISODateSetting } from "../lib/env";

describe("journal streak calculation", () => {
  it("keeps a current streak alive when yesterday was logged but today is not", () => {
    assert.deepEqual(
      computeStreak(["2026-06-24", "2026-06-25", "2026-06-26"], "2026-06-27"),
      {
        current: 3,
        best: 3,
        loggedToday: false,
        lastDay: "2026-06-26",
      }
    );
  });

  it("anchors current streak on today when today is logged", () => {
    assert.equal(
      computeStreak(
        ["2026-06-25", "2026-06-26", "2026-06-27"],
        "2026-06-27"
      ).current,
      3
    );
  });

  it("reports the best grace-day historical run across gaps and duplicate days", () => {
    assert.deepEqual(
      computeStreak(
        [
          "2026-06-20",
          "2026-06-20",
          "2026-06-21",
          "2026-06-23",
          "2026-06-24",
          "2026-06-25",
        ],
        "2026-06-27"
      ),
      {
        current: 0,
        best: 5,
        loggedToday: false,
        lastDay: "2026-06-25",
      }
    );
  });
});

describe("notification streak helpers", () => {
  it("returns the previous local ISO day across month and leap-year boundaries", () => {
    assert.equal(previousDay("2026-03-01"), "2026-02-28");
    assert.equal(previousDay("2024-03-01"), "2024-02-29");
  });

  it("counts a streak ending on an explicit local day", () => {
    assert.equal(
      computeStreakEndingOn(
        ["2026-06-24", "2026-06-25", "2026-06-26"],
        "2026-06-26"
      ),
      3
    );
  });
});

describe("notification week and month helpers", () => {
  it("maps weekdays using the Sunday-zero convention stored in preferences", () => {
    assert.equal(dayOfWeekSundayZero("2026-06-28"), 0);
    assert.equal(dayOfWeekSundayZero("2026-06-29"), 1);
  });

  it("finds Monday week starts, Sunday week ends, and ISO week keys", () => {
    assert.equal(startOfWeekMonday("2026-06-28"), "2026-06-22");
    assert.equal(endOfWeekSunday("2026-06-28"), "2026-06-28");
    assert.equal(isoWeekKey("2026-01-01"), "2026-W01");
    assert.equal(isoWeekKey("2026-12-31"), "2026-W53");
  });

  it("extracts day-of-month and monthly dedupe keys", () => {
    assert.equal(dayOfMonth("2026-06-07"), 7);
    assert.equal(monthKey("2026-06-07"), "2026-06");
  });
});

describe("notification schedule helpers", () => {
  it("computes local date parts for a supplied timezone and instant", () => {
    assert.deepEqual(
      localParts("Europe/London", new Date("2026-06-27T19:30:00.000Z")),
      {
        isoDay: "2026-06-27",
        hhmm: "20:30",
        weekday: "Sat",
      }
    );
  });

  it("checks inclusive start and exclusive end for reminder windows", () => {
    assert.equal(isWithinWindow("20:30", "20:30", 15), true);
    assert.equal(isWithinWindow("20:44", "20:30", 15), true);
    assert.equal(isWithinWindow("20:45", "20:30", 15), false);
    assert.equal(isWithinWindow("19:45", "20:30", 15, 45), true);
    assert.equal(isWithinWindow("19:44", "20:30", 15, 45), false);
  });
});

describe("web push browser helpers", () => {
  it("decodes URL-safe base64 VAPID keys into bytes", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { atob: (value: string) => Buffer.from(value, "base64").toString("binary") },
    });

    try {
      assert.deepEqual([...urlBase64ToUint8Array("SGVsbG8td29ybGQ")], [
        72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
      ]);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});

describe("login navigation safety", () => {
  it("allows relative in-app next paths with query and hash", () => {
    assert.equal(safeNextPath("/journal?tab=life#week"), "/journal?tab=life#week");
  });

  it("falls back to home for external or malformed next targets", () => {
    assert.equal(safeNextPath("https://example.com"), "/");
    assert.equal(safeNextPath("//example.com"), "/");
    assert.equal(safeNextPath("%E0%A4%A"), "/");
    assert.equal(safeNextPath(null), "/");
  });
});

describe("environment setting parsing", () => {
  it("accepts integers within configured bounds", () => {
    assert.equal(parseIntegerSetting("42", 7, { min: 1, max: 100 }), 42);
    assert.equal(parseIntegerSetting("0", 7, { min: 0 }), 0);
  });

  it("falls back for missing, non-integer, or out-of-range values", () => {
    assert.equal(parseIntegerSetting(undefined, 7), 7);
    assert.equal(parseIntegerSetting("", 7), 7);
    assert.equal(parseIntegerSetting("3.5", 7), 7);
    assert.equal(parseIntegerSetting("nope", 7), 7);
    assert.equal(parseIntegerSetting("-1", 7, { min: 0 }), 7);
    assert.equal(parseIntegerSetting("151", 108, { max: 150 }), 108);
  });

  it("accepts only real YYYY-MM-DD date settings", () => {
    assert.equal(parseISODateSetting("1993-12-19", "2000-01-01"), "1993-12-19");
    assert.equal(parseISODateSetting(undefined, "2000-01-01"), "2000-01-01");
    assert.equal(parseISODateSetting("1993-2-19", "2000-01-01"), "2000-01-01");
    assert.equal(parseISODateSetting("1993-02-31", "2000-01-01"), "2000-01-01");
    assert.equal(parseISODateSetting("not-a-date", "2000-01-01"), "2000-01-01");
  });
});

describe("static accessibility affordances", () => {
  it("keeps accessible names on core text-entry controls", () => {
    const home = fs.readFileSync("app/page.tsx", "utf8");
    const login = fs.readFileSync("app/login/page.tsx", "utf8");
    const entryRow = fs.readFileSync("components/EntryRow.tsx", "utf8");

    assert.match(home, /aria-label="Today's journal entry"/);
    assert.match(home, /aria-label="Search previous entries"/);
    assert.match(login, /aria-label="Access token"/);
    assert.match(entryRow, /aria-label=\{`Entry text for \$\{entry\.day\}`\}/);
  });
});
