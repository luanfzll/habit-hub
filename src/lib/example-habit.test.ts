import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "@/domain/calendar-date";
import { computeStats, type HabitHistory } from "@/domain/day-state";
import { buildGrid, gridStart } from "@/domain/grid";
import { exampleHabit } from "./example-habit";

const today = parseCalendarDate("2026-10-14");

function history(habit: ReturnType<typeof exampleHabit>): HabitHistory {
  return {
    startDate: habit.startDate,
    versions: habit.versions,
    entries: new Map(habit.entries.map(({ date, ...entry }) => [date, entry])),
  };
}

describe("home page example", () => {
  it("ends in a 12-day streak, with today still open", () => {
    const habit = exampleHabit(today, "Ler", "páginas");
    expect(computeStats(history(habit), today, gridStart({ today })).currentStreak).toBe(12);
    expect(habit.entries.some((entry) => entry.date === today)).toBe(false);
  });

  it("uses every tone of the grid", () => {
    const { columns } = buildGrid(history(exampleHabit(today, "Ler", "páginas")), { today });
    const levels = new Set(columns.flat().map((day) => (day && "level" in day ? day.level : undefined)));
    expect([...levels].filter((level) => level !== undefined).sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps each date's amount from one day to the next", () => {
    const yesterday = exampleHabit(parseCalendarDate("2026-10-13"), "Ler", "páginas");
    const date = parseCalendarDate("2026-03-01");
    const amount = (habit: typeof yesterday) => habit.entries.find((entry) => entry.date === date)?.value ?? 0;
    expect(amount(exampleHabit(today, "Ler", "páginas"))).toBe(amount(yesterday));
  });
});
