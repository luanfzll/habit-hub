import { addDays, type CalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY, isScheduledOn, weekdaysFromList } from "@/domain/habit-config";
import type { HabitColor } from "@/generated/prisma/enums";
import type { HabitView } from "@/server/habits/service";

const HISTORY_DAYS = 380;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ExampleKey = "ler" | "treinar" | "meditar";

interface ExampleSpec {
  key: ExampleKey;
  color: HabitColor;
  target: number;
  weekdays: number;
  /** Scheduled days in a row that reached the target, ending today (when done) or before. */
  streak: number;
  doneToday: boolean;
  salt: number;
}

/**
 * The made-up habits on the home page. Streaks are kept short on purpose: every day in
 * a streak reached the target, so it shows the strongest tone, and long runs of one
 * tone are dull to look at. The rest of the grid mixes all tones.
 */
const EXAMPLES: ExampleSpec[] = [
  { key: "ler", color: "green", target: 10, weekdays: EVERY_DAY, streak: 5, doneToday: true, salt: 11 },
  {
    key: "treinar",
    color: "orange",
    target: 30,
    weekdays: weekdaysFromList([1, 3, 5]),
    streak: 4,
    doneToday: true,
    salt: 23,
  },
  { key: "meditar", color: "purple", target: 10, weekdays: EVERY_DAY, streak: 3, doneToday: false, salt: 37 },
];

/** A number in [0, 1) that looks random but is always the same for the same inputs. */
function noise(n: number, salt: number): number {
  let t = (n * 0x9e3779b1 + salt * 0x85ebca6b) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** An amount that lands evenly on every tone of the grid, from empty to full. */
function amount(date: CalendarDate, { target, salt }: ExampleSpec): number {
  const n = Date.parse(`${date}T00:00:00Z`) / DAY_MS;
  const u = noise(n, salt);
  if (u < 0.12) return 0;
  if (u < 0.32) return Math.ceil(target * 0.2);
  if (u < 0.54) return Math.round(target * 0.5);
  if (u < 0.76) return Math.round(target * 0.8);
  return target + Math.floor(noise(n, salt + 1) * target * 0.5);
}

function exampleHabit(spec: ExampleSpec, today: CalendarDate, text: { name: string; unit: string }): HabitView {
  const startDate = addDays(today, -HISTORY_DAYS);
  const values = new Map<CalendarDate, number>();
  for (let back = HISTORY_DAYS; back >= 1; back--) {
    const date = addDays(today, -back);
    if (isScheduledOn(spec.weekdays, date)) values.set(date, amount(date, spec));
  }

  // The streak: the last `streak` scheduled days reach the target, and the one before is a miss.
  const scheduledToday = isScheduledOn(spec.weekdays, today);
  let date = spec.doneToday && scheduledToday ? today : addDays(today, -1);
  for (let left = spec.streak; left >= 0; date = addDays(date, -1)) {
    if (!isScheduledOn(spec.weekdays, date)) continue;
    values.set(date, left > 0 ? Math.max(spec.target, amount(date, spec)) : 0);
    left--;
  }

  return {
    id: `exemplo-${spec.key}`,
    publicId: `exemplo-${spec.key}`,
    isPublic: false,
    name: text.name,
    color: spec.color,
    unit: text.unit,
    startDate,
    versions: [{ effectiveFrom: startDate, target: spec.target, weekdays: spec.weekdays }],
    entries: [...values]
      .filter(([, value]) => value > 0)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, value]) => ({ date: day, value, skipped: false, skipReason: null })),
  };
}

/** The three example habits, in display order. `text` gives each one's translated name and unit. */
export function exampleHabits(
  today: CalendarDate,
  text: (key: ExampleKey) => { name: string; unit: string },
): HabitView[] {
  return EXAMPLES.map((spec) => exampleHabit(spec, today, text(spec.key)));
}
