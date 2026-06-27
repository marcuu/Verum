// Month math for the monthly backup reminder. Operates on isoDay strings.

export function dayOfMonth(isoDay: string): number {
  return Number(isoDay.slice(8, 10));
}

// "YYYY-MM" — the monthly dedupe period.
export function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7);
}
