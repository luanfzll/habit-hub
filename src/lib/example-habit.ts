import { addDays, type CalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY } from "@/domain/habit-config";
import type { HabitView } from "@/server/habits/service";

const TARGET = 10;
const STREAK = 12;
const HISTORY_DAYS = 380;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Same made-up amount for a given calendar date on every visit: a mix of misses and partial and full days. */
function amountOn(date: CalendarDate): number {
  const day = Date.parse(`${date}T00:00:00Z`) / DAY_MS;
  const noise = (day * 7919 + (day % 7) * 31) % 17;
  if (noise < 5) return 0;
  if (noise < 7) return 3;
  if (noise < 10) return 6;
  if (noise < 12) return 8;
  return TARGET + (noise % 5);
}

/**
 * The habit shown on the home page, marked as an example: about a year of history
 * and a current streak of STREAK days, with today still open. It never touches the
 * database, and nobody's real habits are shown.
 */
export function exampleHabit(today: CalendarDate, name: string, unit: string): HabitView {
  const startDate = addDays(today, -HISTORY_DAYS);
  const entries: HabitView["entries"] = [];
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const date = addDays(today, -back);
    const value = back <= STREAK ? Math.max(TARGET, amountOn(date)) : amountOn(date);
    if (value > 0) entries.push({ date, value, skipped: false, skipReason: null });
  }
  // The day before the streak is a miss, so the streak is exactly STREAK days long.
  const beforeStreak = addDays(today, -(STREAK + 1));
  return {
    id: "exemplo",
    publicId: "exemplo",
    isPublic: false,
    name,
    color: "green",
    unit,
    startDate,
    versions: [{ effectiveFrom: startDate, target: TARGET, weekdays: EVERY_DAY }],
    entries: entries.filter((entry) => entry.date !== beforeStreak),
  };
}
