// Markdown archive formatter. JSON is for machines; this is the format a
// person (or their grandchildren) opens in forty years — plain text, ordered
// like a book: year chapters, dated entries, nothing that needs software
// smarter than a text editor.

import type { Entry } from "@/lib/types";

function formatDayHeading(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC", // day strings are date-only; render them verbatim
  });
}

export function entriesToMarkdown(
  entries: Entry[],
  exportedOn: string
): string {
  const sorted = [...entries].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0
  );

  const lines: string[] = ["# Verum — journal archive", ""];

  const range = sorted.length
    ? `${sorted[0].day} → ${sorted[sorted.length - 1].day}`
    : "empty";
  lines.push(
    `Exported ${exportedOn} · ${sorted.length} ${
      sorted.length === 1 ? "entry" : "entries"
    } · ${range}`,
    ""
  );

  let currentYear = "";
  for (const e of sorted) {
    const year = e.day.slice(0, 4);
    if (year !== currentYear) {
      currentYear = year;
      lines.push(`## ${year}`, "");
    }
    lines.push(`### ${formatDayHeading(e.day)}`, "", e.text.trim(), "");
  }

  return lines.join("\n");
}
