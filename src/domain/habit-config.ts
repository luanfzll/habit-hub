import { compareDates, weekdayOf, type CalendarDate, type Weekday } from "./calendar-date";

export const MIN_TARGET = 1;
export const MAX_TARGET = 99_999;
export const MAX_VALUE = 99_999;
export const EVERY_DAY = 0b1111111;
export const MAX_ACTIVE_HABITS = 20;
export const MAX_SKIP_REASON = 200;

/** Target and schedule that apply from `effectiveFrom` until the next version. */
export interface ConfigVersion {
  effectiveFrom: CalendarDate;
  target: number;
  /** Bitmask: bit 0 = Sunday ... bit 6 = Saturday. */
  weekdays: number;
}

export function isScheduledOn(weekdays: number, date: CalendarDate): boolean {
  return (weekdays & (1 << weekdayOf(date))) !== 0;
}

export function weekdaysFromList(days: readonly Weekday[]): number {
  return days.reduce<number>((mask, day) => mask | (1 << day), 0);
}

export function weekdaysToList(mask: number): Weekday[] {
  return ([0, 1, 2, 3, 4, 5, 6] as const).filter((day) => (mask & (1 << day)) !== 0);
}

export function sortVersions(versions: readonly ConfigVersion[]): ConfigVersion[] {
  return [...versions].sort((a, b) => compareDates(a.effectiveFrom, b.effectiveFrom));
}

/**
 * Version in effect on `date`: the latest one whose `effectiveFrom` is not after it.
 * Expects versions sorted by `effectiveFrom`.
 */
export function configOn(sortedVersions: readonly ConfigVersion[], date: CalendarDate): ConfigVersion | undefined {
  for (let i = sortedVersions.length - 1; i >= 0; i--) {
    if (sortedVersions[i].effectiveFrom <= date) return sortedVersions[i];
  }
  return undefined;
}
