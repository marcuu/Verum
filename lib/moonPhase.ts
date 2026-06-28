// Reference new moon: January 6, 2000 18:14 UTC (Julian date 2451550.1)
const REFERENCE_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));
const LUNAR_CYCLE_MS = 29.53058867 * 24 * 60 * 60 * 1000;

export type MoonPhaseInfo = {
  phase: number; // 0–1 where 0/1=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  label: string;
  emoji: string;
};

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const elapsed = date.getTime() - REFERENCE_NEW_MOON.getTime();
  const phase = ((elapsed % LUNAR_CYCLE_MS) + LUNAR_CYCLE_MS) % LUNAR_CYCLE_MS / LUNAR_CYCLE_MS;

  let label: string;
  let emoji: string;

  if (phase < 0.025 || phase >= 0.975) {
    label = "New Moon"; emoji = "🌑";
  } else if (phase < 0.25) {
    label = "Waxing Crescent"; emoji = "🌒";
  } else if (phase < 0.275) {
    label = "First Quarter"; emoji = "🌓";
  } else if (phase < 0.5) {
    label = "Waxing Gibbous"; emoji = "🌔";
  } else if (phase < 0.525) {
    label = "Full Moon"; emoji = "🌕";
  } else if (phase < 0.75) {
    label = "Waning Gibbous"; emoji = "🌖";
  } else if (phase < 0.775) {
    label = "Last Quarter"; emoji = "🌗";
  } else {
    label = "Waning Crescent"; emoji = "🌘";
  }

  return { phase, label, emoji };
}
