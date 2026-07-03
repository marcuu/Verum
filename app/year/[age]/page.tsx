"use client";

// The year against the calendar: one age-year of the record, laid out like a
// small book — the weeks as they were lived, the markers pinned along the way,
// and every entry in full. Print it and it's the annual volume.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import type { CSSProperties } from "react";
import { api } from "@/lib/client";
import {
  ageYearRange,
  ageYearWeeks,
  daysBetween,
  mondayOfUTC,
  parseISODateUTC,
} from "@/lib/lifeWeeks";
import type { Entry, LifeMarker } from "@/lib/types";

const DOB = process.env.NEXT_PUBLIC_DOB ?? "1993-12-19";
const LIFE_YEARS = parseInt(process.env.NEXT_PUBLIC_LIFE_YEARS ?? "108", 10);

function longDate(day: string): string {
  const d = parseISODateUTC(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortDate(day: string): string {
  const d = parseISODateUTC(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function YearReview() {
  const params = useParams<{ age: string }>();
  const age = Number(params.age);
  const validAge = Number.isInteger(age) && age >= 0 && age < LIFE_YEARS;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [markers, setMarkers] = useState<LifeMarker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!validAge) return;
    let cancelled = false;
    Promise.all([
      api<Entry[]>("/entries"),
      api<LifeMarker[]>("/life-markers").catch(() => [] as LifeMarker[]),
    ])
      .then(([e, m]) => {
        if (cancelled) return;
        setEntries(e);
        setMarkers(m);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [validAge]);

  const view = useMemo(() => {
    if (!validAge) return null;
    const { start, end } = ageYearRange(DOB, age);
    const weeks = ageYearWeeks(DOB, age);

    const yearEntries = entries
      .filter((e) => e.day >= start && e.day <= end)
      .sort((a, b) => (a.day < b.day ? -1 : 1));

    const entryWeekIdx = new Set<number>();
    const dobMonday = mondayOfUTC(parseISODateUTC(DOB));
    for (const e of yearEntries) {
      entryWeekIdx.add(
        Math.floor(
          daysBetween(dobMonday, mondayOfUTC(parseISODateUTC(e.day))) / 7
        )
      );
    }

    const first = weeks[0]?.absoluteIndex ?? 0;
    const last = weeks[weeks.length - 1]?.absoluteIndex ?? 0;
    const yearMarkers = markers
      .filter((m) => m.week_index >= first && m.week_index <= last)
      .sort((a, b) => a.week_index - b.week_index);
    const markerByIdx = new Map(yearMarkers.map((m) => [m.week_index, m]));

    const currentIdx = Math.floor(
      daysBetween(dobMonday, mondayOfUTC(new Date())) / 7
    );

    const weeksLived = weeks.filter((w) => w.absoluteIndex <= currentIdx).length;

    return {
      start,
      end,
      weeks,
      yearEntries,
      yearMarkers,
      markerByIdx,
      entryWeekIdx,
      currentIdx,
      weeksLived,
    };
  }, [validAge, age, entries, markers]);

  if (!validAge) {
    return (
      <div className="wrap year-review">
        <p className="empty">No such year.</p>
        <Link className="year-back" href="/?tab=life">
          <ArrowLeft size={15} aria-hidden="true" /> Life
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap year-review">
      <header className="year-head">
        <Link className="year-back" href="/?tab=life" aria-label="Back to Life">
          <ArrowLeft size={15} aria-hidden="true" /> Life
        </Link>
        <button
          className="ghost year-print"
          type="button"
          onClick={() => window.print()}
          aria-label="Print this year"
          title="Print — a printed year is the annual volume"
        >
          <Printer size={16} />
        </button>
      </header>

      {/* Print-only title page: the volume opens like a book. */}
      {view && (
        <div className="volume-title" aria-hidden="true">
          <p className="volume-brand">Verum</p>
          <p className="volume-age">Age {age}</p>
          <p className="volume-dates">
            {shortDate(view.start)} — {shortDate(view.end)}
          </p>
        </div>
      )}

      <p className="overline">Year in review</p>
      <h1 className="year-title">Age {age}</h1>
      {view && (
        <p className="year-range">
          {shortDate(view.start)} → {shortDate(view.end)}
        </p>
      )}

      {error && <p className="empty">Couldn&rsquo;t load the year. Reload to retry.</p>}

      {view && loaded && (
        <>
          {/* The weeks as they were lived — real weeks, no compression. */}
          <div className="year-strip" aria-label="Weeks of this year">
            {view.weeks.map((w) => {
              const marker = view.markerByIdx.get(w.absoluteIndex);
              const cls = [
                "cell",
                w.absoluteIndex < view.currentIdx ? "done" : "",
                w.absoluteIndex === view.currentIdx ? "current" : "",
                marker ? "marker" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <span
                  key={w.absoluteIndex}
                  className={cls}
                  title={marker ? `${w.monday} · ${marker.label}` : w.monday}
                  style={
                    marker
                      ? ({ "--marker-accent": marker.accent } as CSSProperties)
                      : undefined
                  }
                >
                  {view.entryWeekIdx.has(w.absoluteIndex) && (
                    <span className="dot" />
                  )}
                </span>
              );
            })}
          </div>

          <p className="year-stats">
            {view.weeksLived} of {view.weeks.length} weeks lived ·{" "}
            {view.yearEntries.length}{" "}
            {view.yearEntries.length === 1 ? "entry" : "entries"} ·{" "}
            {view.yearMarkers.length}{" "}
            {view.yearMarkers.length === 1 ? "marker" : "markers"}
          </p>

          {view.yearMarkers.length > 0 && (
            <section className="year-markers" aria-label="Markers this year">
              <ul>
                {view.yearMarkers.map((m) => (
                  <li key={m.week_index}>
                    <span
                      className="year-marker-dot"
                      style={{ "--marker-accent": m.accent } as CSSProperties}
                      aria-hidden="true"
                    />
                    {m.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view.yearEntries.length === 0 ? (
            <p className="empty">Nothing written this year.</p>
          ) : (
            <section className="year-entries" aria-label="Entries this year">
              {view.yearEntries.map((e) => (
                <article key={e.day} className="year-entry">
                  <h2>{longDate(e.day)}</h2>
                  <p>{e.text}</p>
                </article>
              ))}
            </section>
          )}

          {/* Print-only colophon: the volume closes against the clock. */}
          <div className="volume-colophon" aria-hidden="true">
            <p>
              {view.weeksLived} of {view.weeks.length} weeks of age {age} lived
              · {view.yearEntries.length}{" "}
              {view.yearEntries.length === 1 ? "entry" : "entries"} ·{" "}
              {view.yearMarkers.length}{" "}
              {view.yearMarkers.length === 1 ? "marker" : "markers"}
            </p>
            <p>
              ≈{" "}
              {Math.max(
                0,
                LIFE_YEARS * 52 - (view.currentIdx + 1)
              ).toLocaleString()}{" "}
              weeks remained.
            </p>
            <p className="volume-imprint">
              Set from the Verum record ·{" "}
              {new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
