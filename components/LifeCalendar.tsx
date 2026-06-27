"use client";

import { useMemo } from "react";
import type { Entry } from "@/lib/types";

// Hardcoded life settings (overridable via NEXT_PUBLIC_* env).
const DOB_FIXED = process.env.NEXT_PUBLIC_DOB ?? "1993-12-19";
const EXP_FIXED = parseInt(process.env.NEXT_PUBLIC_LIFE_YEARS ?? "108", 10);

// ---- UTC date helpers ----
function parseISODateUTC(s: string): Date {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Date.UTC(Y, M - 1, D));
}
function addDaysUTC(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
function addYearsUTC(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCFullYear(c.getUTCFullYear() + n);
  return c;
}
function mondayOfUTC(d: Date): Date {
  const wd = d.getUTCDay();
  const off = (wd + 6) % 7;
  return addDaysUTC(d, -off);
}
function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
}

type Bin = {
  hasPast: boolean;
  isCurrent: boolean;
  hasEntry: boolean;
  weeks: number[];
  weekStart: Date | null;
  weekEnd: Date | null;
};

type Row = { age: number; bins: Bin[] };

/**
 * Clean-rows life calendar (ported verbatim from the original):
 * - For each age-year, compute actual week-count (52 or 53) from ISO-week Mondays.
 * - Map proportionally into exactly 52 columns via x = floor(i * 52 / nWeeks).
 * - Merge collisions in a cell; mark "double" when multiple weeks share a cell.
 * - Past/current/entry flags are ORed across merged weeks.
 */
function build(entries: Entry[]): { rows: Row[]; elapsed: number; total: number } {
  const dobDate = parseISODateUTC(DOB_FIXED);
  const dobMonday = mondayOfUTC(dobDate);
  const years = EXP_FIXED;

  const entryWeeks = new Set<number>();
  for (const e of entries) {
    try {
      const m = mondayOfUTC(parseISODateUTC(e.day));
      const idx = Math.floor(daysBetween(dobMonday, m) / 7);
      if (idx >= 0) entryWeeks.add(idx);
    } catch {
      /* ignore malformed day */
    }
  }

  const todayMon = mondayOfUTC(new Date());
  const currentIdx = Math.floor(daysBetween(dobMonday, todayMon) / 7);

  let globalWeekIdx = 0;
  const rows: Row[] = [];

  for (let age = 0; age < years; age++) {
    const start = new Date(
      Date.UTC(
        dobDate.getUTCFullYear() + age,
        dobDate.getUTCMonth(),
        dobDate.getUTCDate()
      )
    );
    const end = addYearsUTC(start, 1);

    let wStart = mondayOfUTC(start);
    const wEnd = mondayOfUTC(end);

    const mondays: Date[] = [];
    while (wStart < wEnd) {
      mondays.push(new Date(wStart));
      wStart = addDaysUTC(wStart, 7);
    }

    const N = mondays.length; // 52 or 53
    const bins: Bin[] = Array.from({ length: 52 }, () => ({
      hasPast: false,
      isCurrent: false,
      hasEntry: false,
      weeks: [],
      weekStart: null,
      weekEnd: null,
    }));

    for (let i = 0; i < N; i++) {
      const binX = Math.floor((i * 52) / N);
      const mStart = mondays[i];
      const mEnd = addDaysUTC(mStart, 6);
      const b = bins[binX];
      b.weeks.push(i);
      if (!b.weekStart || mStart < b.weekStart) b.weekStart = mStart;
      if (!b.weekEnd || mEnd > b.weekEnd) b.weekEnd = mEnd;
    }

    for (let x = 0; x < 52; x++) {
      const b = bins[x];
      if (b.weeks.length === 0) continue;
      for (const i of b.weeks) {
        const abs = globalWeekIdx + i;
        if (abs < currentIdx) b.hasPast = true;
        if (abs === currentIdx) b.isCurrent = true;
        if (entryWeeks.has(abs)) b.hasEntry = true;
      }
    }

    rows.push({ age, bins });
    globalWeekIdx += N;
  }

  const total = globalWeekIdx;
  const elapsed = Math.min(total, currentIdx + 1);
  return { rows, elapsed, total };
}

export default function LifeCalendar({ entries }: { entries: Entry[] }) {
  const { rows, elapsed, total } = useMemo(() => build(entries), [entries]);
  const pct = total ? ((elapsed / total) * 100).toFixed(1) : "0.0";

  return (
    <section className="life" aria-labelledby="lifeTitle">
      <h3 id="lifeTitle">Life</h3>
      <div className="life-stats">
        {elapsed} of {total} weeks lived · {pct}%
      </div>
      <div>
        {rows.map(({ age, bins }) => (
          <div className="year-line" key={age}>
            <div className={"year-label" + (age % 10 === 0 ? " bold" : "")}>
              {age % 10 === 0 ? `Age ${age}` : ""}
            </div>
            {bins.map((b, x) => {
              const cls = [
                "cell",
                b.hasPast ? "done" : "",
                b.isCurrent ? "current" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const title =
                b.weekStart && b.weekEnd
                  ? `${b.weekStart.toISOString().slice(0, 10)} → ${b.weekEnd
                      .toISOString()
                      .slice(0, 10)} (Age ${age})`
                  : `Age ${age}`;
              return (
                <div className={cls} key={x} title={title}>
                  {b.hasEntry && <div className="dot" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
