// Age-year math for the life calendar and the year-in-review artifact.
// An "age-year" is row N of the life calendar: the year of life running from
// dob+N years (inclusive) to the day before dob+N+1 years. All helpers work
// on date-only ISO strings with UTC arithmetic (exact for date-only values).

export function parseISODateUTC(s: string): Date {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Date.UTC(Y, (M || 1) - 1, D || 1));
}

export function toISODateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysUTC(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

export function addYearsUTC(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCFullYear(c.getUTCFullYear() + n);
  return c;
}

export function mondayOfUTC(d: Date): Date {
  const wd = d.getUTCDay();
  return addDaysUTC(d, -((wd + 6) % 7));
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

// Inclusive calendar range of age-year `age`: birthday to the day before the
// next one.
export function ageYearRange(
  dobISO: string,
  age: number
): { start: string; end: string } {
  const dob = parseISODateUTC(dobISO);
  const start = addYearsUTC(dob, age);
  const end = addDaysUTC(addYearsUTC(dob, age + 1), -1);
  return { start: toISODateUTC(start), end: toISODateUTC(end) };
}

// Completed years of life on `todayISO` (the conventional "age").
export function currentAge(dobISO: string, todayISO: string): number {
  const dob = parseISODateUTC(dobISO);
  const today = parseISODateUTC(todayISO);
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const anniversary = addYearsUTC(dob, age);
  if (anniversary > today) age -= 1;
  return Math.max(0, age);
}

// The most recently completed age-year row, or null before the first birthday.
export function lastClosedAge(dobISO: string, todayISO: string): number | null {
  const age = currentAge(dobISO, todayISO);
  return age >= 1 ? age - 1 : null;
}

// The birthday moment: for `days` starting on each birthday, the review of the
// age-year that just closed is offered. Returns the closed row while active.
export function birthdayWindow(
  dobISO: string,
  todayISO: string,
  days = 7
): { active: boolean; closedAge: number | null } {
  const today = parseISODateUTC(todayISO);
  const age = currentAge(dobISO, todayISO);
  if (age < 1) return { active: false, closedAge: null };

  const anniversary = addYearsUTC(parseISODateUTC(dobISO), age);
  const sinceBirthday = daysBetween(anniversary, today);
  const active = sinceBirthday >= 0 && sinceBirthday < days;
  return { active, closedAge: active ? age - 1 : null };
}

// The Mondays covering an age-year, each with its absolute life-week index
// (weeks since the Monday of the dob week — the index life markers use).
export function ageYearWeeks(
  dobISO: string,
  age: number
): { monday: string; absoluteIndex: number }[] {
  const dob = parseISODateUTC(dobISO);
  const dobMonday = mondayOfUTC(dob);
  const start = addYearsUTC(dob, age);
  const end = addYearsUTC(dob, age + 1);

  const weeks: { monday: string; absoluteIndex: number }[] = [];
  let m = mondayOfUTC(start);
  const stop = mondayOfUTC(end);
  while (m < stop) {
    weeks.push({
      monday: toISODateUTC(m),
      absoluteIndex: Math.floor(daysBetween(dobMonday, m) / 7),
    });
    m = addDaysUTC(m, 7);
  }
  return weeks;
}
