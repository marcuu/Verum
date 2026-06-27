// UTC date helpers shared across API routes (mirrors the Flask utc helpers).

export function utcTs(): string {
  return new Date().toISOString();
}

export function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
