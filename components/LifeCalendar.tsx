"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { api } from "@/lib/client";
import type { Entry, LifeMarker } from "@/lib/types";

// Hardcoded life settings (overridable via NEXT_PUBLIC_* env).
const DOB_FIXED = process.env.NEXT_PUBLIC_DOB ?? "1993-12-19";
const EXP_FIXED = parseInt(process.env.NEXT_PUBLIC_LIFE_YEARS ?? "108", 10);
const MAX_MARKERS = 12;

type LifeMarkerMap = Record<string, LifeMarker>;

const MARKER_ACCENTS = [
  { name: "amber", value: "#d89b48" },
  { name: "rose", value: "#c96a74" },
  { name: "sage", value: "#87a96b" },
  { name: "blue", value: "#6f9ecf" },
] as const;

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
  absoluteWeeks: number[];
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
      absoluteWeeks: [],
      weekStart: null,
      weekEnd: null,
    }));

    for (let i = 0; i < N; i++) {
      const binX = Math.floor((i * 52) / N);
      const mStart = mondays[i];
      const mEnd = addDaysUTC(mStart, 6);
      const b = bins[binX];
      b.weeks.push(i);
      b.absoluteWeeks.push(globalWeekIdx + i);
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

function markerCount(markers: LifeMarkerMap): number {
  return Object.keys(markers).length;
}

function mapMarkers(markers: LifeMarker[]): LifeMarkerMap {
  return Object.fromEntries(
    markers.map((marker) => [String(marker.week_index), marker])
  );
}

function formatUTCDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default function LifeCalendar({ entries }: { entries: Entry[] }) {
  const { rows, elapsed, total } = useMemo(() => build(entries), [entries]);
  const [markers, setMarkers] = useState<LifeMarkerMap>({});
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAccent, setDraftAccent] = useState<string>(MARKER_ACCENTS[0].value);
  const [markerError, setMarkerError] = useState("");
  const pct = total ? ((elapsed / total) * 100).toFixed(1) : "0.0";
  const remaining = Math.max(0, total - elapsed);
  const yearsLeft = Math.round(remaining / 52);
  const selectedMarker =
    selectedWeek === null ? null : markers[String(selectedWeek)] ?? null;
  const selectedBin =
    selectedWeek === null
      ? null
      : rows
          .flatMap((row) => row.bins)
          .find((bin) => bin.absoluteWeeks.includes(selectedWeek)) ?? null;

  useEffect(() => {
    let cancelled = false;

    api<LifeMarker[]>("/life-markers")
      .then((data) => {
        if (!cancelled) setMarkers(mapMarkers(data));
      })
      .catch(() => {
        if (!cancelled) setMarkerError("Couldn't load life markers.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;
    const marker = markers[String(selectedWeek)];
    setDraftLabel(marker?.label ?? "");
    setDraftAccent(marker?.accent ?? MARKER_ACCENTS[0].value);
  }, [markers, selectedWeek]);

  async function saveMarker() {
    if (selectedWeek === null) return;
    const label = draftLabel.trim();
    if (!label) return;
    const key = String(selectedWeek);
    if (!markers[key] && markerCount(markers) >= MAX_MARKERS) {
      setMarkerError(`Life markers are capped at ${MAX_MARKERS}.`);
      return;
    }

    setMarkerError("");
    try {
      const data = await api<{ marker: LifeMarker }>("/life-markers", {
        method: "POST",
        body: JSON.stringify({
          week_index: selectedWeek,
          label,
          accent: draftAccent,
        }),
      });
      setMarkers((prev) => ({
        ...prev,
        [key]: data.marker,
      }));
    } catch {
      setMarkerError("Couldn't save that marker.");
    }
  }

  async function removeMarker() {
    if (selectedWeek === null) return;
    const key = String(selectedWeek);

    setMarkerError("");
    try {
      await api(`/life-markers/${selectedWeek}`, { method: "DELETE" });
      setMarkers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      setMarkerError("Couldn't remove that marker.");
    }
  }

  return (
    <section className="life" aria-labelledby="lifeTitle">
      <h3 id="lifeTitle">Life</h3>
      <style>{`
        @keyframes life-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .life .cell.current {
          animation: life-breathe 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .life .cell.current { animation: none; }
        }
        .life-remaining {
          color: var(--muted);
          font-size: 0.85rem;
          margin: 0 0 0.35rem;
        }
      `}</style>
      <div
        className="life-remaining"
        title={`${remaining.toLocaleString()} weeks · ≈ ${yearsLeft} years remaining`}
      >
        ≈ {remaining.toLocaleString()} weeks left.
      </div>
      <div className="life-stats">
        {elapsed} of {total} weeks lived · {pct}% · {markerCount(markers)}/{MAX_MARKERS} markers
      </div>
      {selectedWeek !== null && selectedBin && (
        <div className="marker-editor" aria-label="Life marker editor">
          <div className="marker-editor-copy">
            <strong>Week {selectedWeek + 1}</strong> · {formatUTCDate(selectedBin.weekStart)} → {formatUTCDate(selectedBin.weekEnd)}
          </div>
          <input
            type="text"
            maxLength={40}
            placeholder="Small life marker…"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveMarker();
              if (e.key === "Escape") setSelectedWeek(null);
            }}
          />
          <div className="marker-actions">
            {MARKER_ACCENTS.map((accent) => (
              <button
                aria-label={`${accent.name} marker`}
                className={draftAccent === accent.value ? "selected" : ""}
                key={accent.value}
                onClick={() => setDraftAccent(accent.value)}
                style={{ "--marker-accent": accent.value } as CSSProperties}
                type="button"
              />
            ))}
            <button
              type="button"
              onClick={() => void saveMarker()}
              disabled={!draftLabel.trim()}
            >
              Pin
            </button>
            {selectedMarker && (
              <button type="button" onClick={() => void removeMarker()}>
                Remove
              </button>
            )}
          </div>
          {markerError && <div className="marker-error">{markerError}</div>}
        </div>
      )}
      <div>
        {rows.map(({ age, bins }) => (
          <div className="year-line" key={age}>
            <div className={"year-label" + (age % 10 === 0 ? " bold" : "")}>
              {age % 10 === 0 ? `Age ${age}` : ""}
            </div>
            {bins.map((b, x) => {
              const markerWeek = b.absoluteWeeks.find((week) => markers[String(week)]);
              const marker = markerWeek === undefined ? null : markers[String(markerWeek)];
              const cls = [
                "cell",
                b.hasPast ? "done" : "",
                b.isCurrent ? "current" : "",
                marker ? "marker" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const dateTitle =
                b.weekStart && b.weekEnd
                  ? `${formatUTCDate(b.weekStart)} → ${formatUTCDate(b.weekEnd)} (Age ${age})`
                  : `Age ${age}`;
              const title = marker ? `${dateTitle} · Marker: ${marker.label}` : dateTitle;
              return (
                <button
                  aria-label={marker ? `Edit marker: ${marker.label}` : `Add marker for ${dateTitle}`}
                  className={cls}
                  key={x}
                  onClick={() => setSelectedWeek(markerWeek ?? b.absoluteWeeks[0] ?? null)}
                  style={marker ? ({ "--marker-accent": marker.accent } as CSSProperties) : undefined}
                  title={title}
                  type="button"
                >
                  {b.hasEntry && <span className="dot" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
