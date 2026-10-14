import { describe, expect, it } from "vitest";
import { addDays, parseCalendarDate } from "@/domain/calendar-date";
import { computeStats, type HabitHistory } from "@/domain/day-state";
import { buildGrid, gridStart } from "@/domain/grid";
import type { HabitView } from "@/server/habits/service";
import { exampleHabits } from "./example-habits";

const text = (key: string) => ({ name: key, unit: "un" });

function history(habit: HabitView): HabitHistory {
  return {
    startDate: habit.startDate,
    versions: habit.versions,
    entries: new Map(habit.entries.map(({ date, ...entry }) => [date, entry])),
  };
}

const streaks = (today: string) =>
  exampleHabits(parseCalendarDate(today), text).map(
    (habit) =>
      computeStats(history(habit), parseCalendarDate(today), gridStart({ today: parseCalendarDate(today) }))
        .currentStreak,
  );

describe("home page examples", () => {
  it("have short streaks, whatever the weekday", () => {
    // 2026-10-14 is a Wednesday (a training day); 2026-10-15 is a Thursday (not one).
    expect(streaks("2026-10-14")).toEqual([5, 4, 3]);
    expect(streaks("2026-10-15")).toEqual([5, 4, 3]);
  });

  it("leave today open for one of them", () => {
    const today = parseCalendarDate("2026-10-14");
    const done = exampleHabits(today, text).map((habit) => habit.entries.some((entry) => entry.date === today));
    expect(done).toEqual([true, true, false]);
  });

  it("use every tone of the grid in the last 12 weeks", () => {
    const today = parseCalendarDate("2026-10-14");
    for (const habit of exampleHabits(today, text)) {
      const { columns } = buildGrid(history(habit), { today, weeks: 12 });
      const levels = new Set(columns.flat().flatMap((day) => (day && "level" in day ? [day.level] : [])));
      expect([...levels].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  it("give each date the same amount from one day to the next", () => {
    const today = parseCalendarDate("2026-10-14");
    const date = addDays(today, -100);
    const amountOn = (habits: HabitView[]) => habits[0].entries.find((entry) => entry.date === date)?.value ?? 0;
    expect(amountOn(exampleHabits(today, text))).toBe(amountOn(exampleHabits(addDays(today, 1), text)));
  });
});
