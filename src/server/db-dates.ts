import { parseCalendarDate, type CalendarDate } from "@/domain/calendar-date";

/*
 * The only place that converts between CalendarDate and the Date objects Prisma
 * uses for `@db.Date` columns. Prisma represents a DATE as midnight UTC, so only
 * UTC accessors are used here; local-time getters would shift the day.
 */

export function toDbDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(value: Date): CalendarDate {
  return parseCalendarDate(value.toISOString().slice(0, 10));
}
