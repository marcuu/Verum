// Local date/time helpers for notification scheduling only. The journal date
// model (UTC, see lib/dates.ts) is intentionally left untouched.

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

// Returns true when nowHHMM falls inside
//   [target - graceBeforeMinutes, target + windowMinutes).
//
// graceBeforeMinutes lets a single once-daily cron (Vercel Hobby plan) absorb
// the BST/GMT hour shift: a job pinned to a fixed UTC time lands at either the
// configured local hour or one hour earlier depending on DST, so a wide bracket
// is needed to still fire. For a precise */15 cron, call with the default grace
// of 0 and a tight window.
export function isWithinWindow(
  nowHHMM: string,
  targetHHMM: string,
  windowMinutes = 15,
  graceBeforeMinutes = 0
): boolean {
  const [nh, nm] = nowHHMM.split(":").map(Number);
  const [th, tm] = targetHHMM.slice(0, 5).split(":").map(Number);

  const now = nh * 60 + nm;
  const target = th * 60 + tm;

  return now >= target - graceBeforeMinutes && now < target + windowMinutes;
}
