// Shared text helpers used by both the UI (greeting line) and the
// notifications module (push bodies). Lives here so the UI never has to
// import from lib/notifications for a plain string utility.

// The closing line of an entry — the voice a day ended on. Moments-structured
// entries make this the last moment.
export function lastLineOf(text: string): string {
  return text.trim().split("\n").map((l) => l.trim()).filter(Boolean).pop() ?? "";
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
