// Local date/time helpers for notification scheduling. The journal day model
// also runs on local days now (see lib/dates.ts localDay).

export type LocalParts = {
  isoDay: string;
  hhmm: string;
  weekday: string;
};

export function localParts(timezone: string, date = new Date()): LocalParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    isoDay: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${get("hour")}:${get("minute")}`,
    weekday: get("weekday"),
  };
}
