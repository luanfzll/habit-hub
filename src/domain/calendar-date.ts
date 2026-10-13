/**
 * A calendar day ("YYYY-MM-DD") with no time and no time zone.
 *
 * Every day in the app is represented this way. Arithmetic is done on UTC
 * milliseconds only, so the result never depends on the machine's time zone.
 */
export type CalendarDate = string & { readonly __brand: "CalendarDate" };

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function toUtcMs(date: CalendarDate): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function fromUtcMs(ms: number): CalendarDate {
  return new Date(ms).toISOString().slice(0, 10) as CalendarDate;
}

export function parseCalendarDate(value: string): CalendarDate {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Invalid calendar date: "${value}"`);
  }
  const [, year, month, day] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));
  // Rejects dates that overflow, such as 2026-02-30.
  if (Number.isNaN(ms) || fromUtcMs(ms) !== value) {
    throw new RangeError(`Invalid calendar date: "${value}"`);
  }
  return value as CalendarDate;
}

export function isCalendarDate(value: string): value is CalendarDate {
  try {
    parseCalendarDate(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

export function weekdayOf(date: CalendarDate): Weekday {
  return new Date(toUtcMs(date)).getUTCDay() as Weekday;
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  // "YYYY-MM-DD" strings sort chronologically.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a > b ? a : b;
}

export function minDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a < b ? a : b;
}

/** First day of the week containing `date`. */
export function startOfWeek(date: CalendarDate, weekStartsOn: Weekday = 0): CalendarDate {
  const offset = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function monthOf(date: CalendarDate): number {
  return Number(date.slice(5, 7));
}

export function dayOfMonth(date: CalendarDate): number {
  return Number(date.slice(8, 10));
}

/** Calendar day in `timeZone` at instant `now`. */
export function todayIn(timeZone: string, now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return parseCalendarDate(`${get("year")}-${get("month")}-${get("day")}`);
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Every day from `from` to `to`, both included. */
export function* eachDay(from: CalendarDate, to: CalendarDate): Generator<CalendarDate> {
  for (let ms = toUtcMs(from), end = toUtcMs(to); ms <= end; ms += MS_PER_DAY) {
    yield fromUtcMs(ms);
  }
}
