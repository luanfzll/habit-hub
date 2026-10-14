import type { CalendarDate } from "@/domain/calendar-date";
import { LOCALE } from "@/i18n/request";

// CalendarDates are formatted as UTC midnight so the printed day never shifts.
function utcDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });

const monthName = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });

const weekdayDayMonth = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

/** "ter., 13 de out. de 2026" */
export function formatShortDate(date: CalendarDate): string {
  return shortDate.format(utcDate(date));
}

/** "terça-feira, 13 de outubro" */
export function formatLongDate(date: CalendarDate): string {
  return longDate.format(utcDate(date));
}

/** "13 de out." */
export function formatDayMonth(date: CalendarDate): string {
  return dayMonth.format(utcDate(date));
}

/** "Out" for month 10. */
export function formatMonthLabel(month: number): string {
  const label = monthName.format(new Date(Date.UTC(2026, month - 1, 1))).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "seg., 12/10" */
export function formatWeekdayDayMonth(date: CalendarDate): string {
  return weekdayDayMonth.format(utcDate(date));
}
