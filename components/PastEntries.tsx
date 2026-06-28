"use client";

import { useState } from "react";
import type { Entry } from "@/lib/types";

// "Let my past self meet my present self." A quiet, collapsed recall of the real
// entries written on this exact date in prior years. Nothing generated, nothing
// scored — pure data, rendered only when it exists.

function yearsAgo(day: string, today: string): number {
  return Number(today.slice(0, 4)) - Number(day.slice(0, 4));
}

// Show the year explicitly so the label is unambiguous in historical views.
function whenLabel(day: string, years: number): string {
  const year = day.slice(0, 4);
  const yearsLabel = years === 1 ? "1 year ago" : `${years} years ago`;
  return `${year} · ${yearsLabel}`;
}

function PastEntryRow({ entry, years }: { entry: Entry; years: number }) {
  const [open, setOpen] = useState(false);

  return (
    <li className={"past-row" + (open ? " open" : "")}>
      <button
        type="button"
        className="past-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="past-when">{whenLabel(entry.day, years)}</span>
        <span className="past-preview" aria-hidden={open}>
          {entry.text}
        </span>
      </button>
      {open && <div className="text past-text">{entry.text}</div>}
    </li>
  );
}

export default function PastEntries({
  entries,
  today,
}: {
  entries: Entry[];
  today: string;
}) {
  // Invisible beats filler: no history for this date means no block at all.
  if (entries.length === 0) return null;

  return (
    <section className="past" aria-label="On this day in past years">
      <ul>
        {entries.map((e) => (
          <PastEntryRow key={e.day} entry={e} years={yearsAgo(e.day, today)} />
        ))}
      </ul>
    </section>
  );
}
