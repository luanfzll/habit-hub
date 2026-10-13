import { eachDay, maxDate, type CalendarDate } from "./calendar-date";
import { configOn, isScheduledOn, sortVersions, type ConfigVersion } from "./habit-config";

export interface DayEntry {
  value: number;
  skipped: boolean;
}

/** Everything needed to evaluate any day of a habit. */
export interface HabitHistory {
  startDate: CalendarDate;
  versions: readonly ConfigVersion[];
  entries: ReadonlyMap<CalendarDate, DayEntry>;
}

export type DayKind =
  /** Scheduled and target reached. */
  | "done"
  /** Scheduled, finished, 0 < value < target. */
  | "partial"
  /** Scheduled, finished, nothing registered. */
  | "missed"
  /** Today, scheduled, target not reached yet (may hold a partial value). */
  | "pending"
  /** Not scheduled and nothing registered. */
  | "off-schedule"
  /** Not scheduled but something was registered. */
  | "extra"
  /** Skipped on purpose (illness, travel...). */
  | "skipped"
  /** Before the habit started. */
  | "before-start"
  /** After today. */
  | "future";

export type Level = 0 | 1 | 2 | 3 | 4;

export interface DayState {
  date: CalendarDate;
  kind: DayKind;
  /** Color intensity: 0 = empty, 4 = target reached. */
  level: Level;
  value: number;
  target: number;
  scheduled: boolean;
  isToday: boolean;
}

/** 0 = nothing, 1 = up to 1/3 of the target, 2 = up to 2/3, 3 = below target, 4 = target reached. */
export function levelFor(value: number, target: number): Level {
  if (value <= 0) return 0;
  if (value * 3 <= target) return 1;
  if (value * 3 <= target * 2) return 2;
  if (value < target) return 3;
  return 4;
}

/** Days that can be registered: from the start date up to today. */
export function isEditableDay(date: CalendarDate, startDate: CalendarDate, today: CalendarDate): boolean {
  return date >= startDate && date <= today;
}

/** Evaluates every day from `from` to `to` (both included). */
export function evaluateDays(
  history: HabitHistory,
  from: CalendarDate,
  to: CalendarDate,
  today: CalendarDate,
): DayState[] {
  const versions = sortVersions(history.versions);
  const fallback = versions[0];
  const states: DayState[] = [];

  for (const date of eachDay(from, to)) {
    const config = configOn(versions, date) ?? fallback;
    const target = config?.target ?? 1;
    const scheduled = config ? isScheduledOn(config.weekdays, date) : false;
    const entry = history.entries.get(date);
    const value = entry?.skipped ? 0 : (entry?.value ?? 0);
    const isToday = date === today;

    let kind: DayKind;
    if (date > today) kind = "future";
    else if (date < history.startDate) kind = "before-start";
    else if (entry?.skipped) kind = "skipped";
    else if (!scheduled) kind = value > 0 ? "extra" : "off-schedule";
    else if (value >= target) kind = "done";
    else if (isToday) kind = "pending";
    else kind = value > 0 ? "partial" : "missed";

    const showsValue = kind !== "future" && kind !== "before-start" && kind !== "skipped";
    states.push({
      date,
      kind,
      level: showsValue ? levelFor(value, target) : 0,
      value,
      target,
      scheduled,
      isToday,
    });
  }
  return states;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  /** Completion over the window: done ÷ finished scheduled days. Null when there is nothing to measure yet. */
  completionRate: number | null;
  doneDays: number;
  measuredDays: number;
}

/**
 * Streaks use the whole history; the completion rate only counts days from `rateFrom`.
 * Today counts for the rate only once it is done, so an unfinished day never lowers it.
 */
export function computeStats(history: HabitHistory, today: CalendarDate, rateFrom: CalendarDate): HabitStats {
  if (history.startDate > today) {
    return { currentStreak: 0, longestStreak: 0, completionRate: null, doneDays: 0, measuredDays: 0 };
  }

  const days = evaluateDays(history, history.startDate, today, today);
  const rateStart = maxDate(rateFrom, history.startDate);

  let run = 0;
  let longest = 0;
  let doneDays = 0;
  let measuredDays = 0;

  for (const day of days) {
    switch (day.kind) {
      case "done":
        run += 1;
        longest = Math.max(longest, run);
        break;
      case "missed":
      case "partial":
        run = 0;
        break;
      // "pending", "skipped", "off-schedule" and "extra" neither add to nor break the streak.
    }

    if (day.date >= rateStart) {
      if (day.kind === "done") {
        doneDays += 1;
        measuredDays += 1;
      } else if (day.kind === "missed" || day.kind === "partial") {
        measuredDays += 1;
      }
    }
  }

  return {
    currentStreak: run,
    longestStreak: longest,
    completionRate: measuredDays === 0 ? null : doneDays / measuredDays,
    doneDays,
    measuredDays,
  };
}
