// Server-only config derived from environment variables.

export const CORE_THRESHOLD = parseInt(
  process.env.QUOTES_CORE_THRESHOLD ?? "3",
  10
);

export const AVOID_DAYS = parseInt(process.env.QUOTES_AVOID_DAYS ?? "14", 10);

// Table names (verum_ prefixed, co-located in the public schema).
export const T_ENTRIES = "verum_entries";
export const T_QUOTES = "verum_quotes";
export const T_DAILY_PICK = "verum_quotes_daily_pick";

export const isCore = (score: number) => score >= CORE_THRESHOLD;
