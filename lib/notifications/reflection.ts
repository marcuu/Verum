// Resonance selection for the weekly reflection: the notification should read
// like a line from a short letter assembled from the owner's own sentences —
// this week last year coming back — not statistics about the week.

export type ReflectionEntry = { day: string; text: string };

// Shift a date-only ISO day by whole years. Feb 29 → Mar 1 on non-leap years,
// which is fine for a "roughly this week" recall window.
export function shiftYears(isoDay: string, years: number): string {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// Collapse whitespace and cut at a word boundary. Push bodies get one line;
// the excerpt should feel like a sentence resurfacing, not a truncated dump.
export function excerpt(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : clean.slice(0, max)).trimEnd() + "…";
}

// The most substantial entry carries the most of the week's texture; prefer it.
// Ties (same length) resolve to the earlier day for determinism.
export function pickResonantEntry(
  entries: ReflectionEntry[]
): ReflectionEntry | null {
  let best: ReflectionEntry | null = null;
  for (const e of entries) {
    const text = (e.text ?? "").trim();
    if (!text) continue;
    if (
      !best ||
      text.length > best.text.length ||
      (text.length === best.text.length && e.day < best.day)
    ) {
      best = { day: e.day, text };
    }
  }
  return best;
}
