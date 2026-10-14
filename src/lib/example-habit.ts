import { addDays, type CalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY } from "@/domain/habit-config";
import type { HabitView } from "@/server/habits/service";

const TARGET = 10;
const STREAK = 12;
const HISTORY_DAYS = 380;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The made-up history is simulated from this date on, so each date always gets the same amount. */
const SIMULATION_START = "2024-01-01";

const dayNumber = (date: CalendarDate | string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;

/** A number in [0, 1) that looks random but is always the same for the same inputs. */
function noise(n: number, salt: number): number {
  let t = (n * 0x9e3779b1 + salt * 0x85ebca6b) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Motivation that drifts smoothly over the weeks, between 0 and 1. */
function motivation(n: number): number {
  const week = Math.floor(n / 7);
  const t = (n % 7) / 7;
  const eased = t * t * (3 - 2 * t);
  return noise(week, 1) * (1 - eased) + noise(week + 1, 1) * eased;
}

/**
 * Simulates a person reading day by day: good and bad phases, days that follow each
 * other (having read yesterday makes reading today likelier), weaker weekends, the
 * odd week off, and amounts that are sometimes short of the target, sometimes over.
 */
function simulate(until: CalendarDate): Map<number, number> {
  const amounts = new Map<number, number>();
  let readYesterday = false;
  for (let n = dayNumber(SIMULATION_START); n <= dayNumber(until); n++) {
    const weekday = (n + 4) % 7; // 1970-01-01 was a Thursday
    const weekOff = noise(Math.floor(n / 7), 2) < 0.06;
    let chance: number = 0.2 + 0.65 * motivation(n) + (readYesterday ? 0.12 : -0.08);
    if (weekday === 0 || weekday === 6) chance -= 0.18;
    if (weekOff) chance = 0.08;

    const read: boolean = noise(n, 3) < Math.min(0.95, Math.max(0.03, chance));
    if (read) {
      const size = noise(n, 4);
      // A quarter of the days fall short of the target; the rest reach it, some go well past it.
      amounts.set(n, size < 0.25 ? 2 + Math.floor(noise(n, 5) * 8) : TARGET + Math.floor(noise(n, 5) ** 2 * 12));
    }
    readYesterday = read;
  }
  return amounts;
}

/**
 * The habit shown on the home page, marked as an example: about a year of natural-looking
 * history and a current streak of STREAK days, with today still open. It never touches
 * the database, and nobody's real habits are shown.
 */
export function exampleHabit(today: CalendarDate, name: string, unit: string): HabitView {
  const startDate = addDays(today, -HISTORY_DAYS);
  const amounts = simulate(today);
  const entries: HabitView["entries"] = [];
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const date = addDays(today, -back);
    const simulated = amounts.get(dayNumber(date)) ?? 0;
    // The last STREAK days are all done, and the day before them is a miss.
    const value = back <= STREAK ? Math.max(TARGET, simulated) : back === STREAK + 1 ? 0 : simulated;
    if (value > 0) entries.push({ date, value, skipped: false, skipReason: null });
  }
  return {
    id: "exemplo",
    publicId: "exemplo",
    isPublic: false,
    name,
    color: "green",
    unit,
    startDate,
    versions: [{ effectiveFrom: startDate, target: TARGET, weekdays: EVERY_DAY }],
    entries,
  };
}
