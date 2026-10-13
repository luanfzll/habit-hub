import { describe, expect, it } from "vitest";
import { parseCalendarDate, type CalendarDate } from "./calendar-date";
import { computeStats, evaluateDays, levelFor, type DayEntry, type HabitHistory } from "./day-state";
import { EVERY_DAY, weekdaysFromList, type ConfigVersion } from "./habit-config";

const d = parseCalendarDate;

function history(
  startDate: string,
  versions: Array<Omit<ConfigVersion, "effectiveFrom"> & { effectiveFrom: string }>,
  entries: Record<string, number | "skip"> = {},
): HabitHistory {
  return {
    startDate: d(startDate),
    versions: versions.map((v) => ({ ...v, effectiveFrom: d(v.effectiveFrom) })),
    entries: new Map<CalendarDate, DayEntry>(
      Object.entries(entries).map(([date, value]) => [
        d(date),
        value === "skip" ? { value: 0, skipped: true } : { value, skipped: false },
      ]),
    ),
  };
}

function kinds(h: HabitHistory, from: string, to: string, today: string) {
  return evaluateDays(h, d(from), d(to), d(today)).map((day) => day.kind);
}

describe("levelFor", () => {
  it("maps progress to tones", () => {
    expect(levelFor(0, 20)).toBe(0);
    expect(levelFor(5, 20)).toBe(1);
    expect(levelFor(7, 20)).toBe(2);
    expect(levelFor(14, 20)).toBe(3);
    expect(levelFor(20, 20)).toBe(4);
    expect(levelFor(35, 20)).toBe(4);
  });

  it("only has empty or full for target 1", () => {
    expect(levelFor(0, 1)).toBe(0);
    expect(levelFor(1, 1)).toBe(4);
  });
});

describe("evaluateDays", () => {
  const daily = [{ effectiveFrom: "2026-10-01", target: 1, weekdays: EVERY_DAY }];

  it("classifies done, missed, pending and future days", () => {
    const h = history("2026-10-01", daily, { "2026-10-01": 1, "2026-10-03": 1 });
    expect(kinds(h, "2026-09-30", "2026-10-05", "2026-10-04")).toEqual([
      "before-start",
      "done",
      "missed",
      "done",
      "pending",
      "future",
    ]);
  });

  it("marks partial progress and keeps today pending until the target is reached", () => {
    const h = history("2026-10-01", [{ effectiveFrom: "2026-10-01", target: 20, weekdays: EVERY_DAY }], {
      "2026-10-01": 5,
      "2026-10-02": 12,
    });
    const days = evaluateDays(h, d("2026-10-01"), d("2026-10-02"), d("2026-10-02"));
    expect(days.map((day) => [day.kind, day.level])).toEqual([
      ["partial", 1],
      ["pending", 2],
    ]);
  });

  it("treats unscheduled days as off-schedule or extra", () => {
    // Monday, Wednesday and Friday only. 2026-10-05 is a Monday.
    const mwf = weekdaysFromList([1, 3, 5]);
    const h = history("2026-10-05", [{ effectiveFrom: "2026-10-05", target: 1, weekdays: mwf }], {
      "2026-10-06": 1,
    });
    expect(kinds(h, "2026-10-05", "2026-10-07", "2026-10-08")).toEqual(["missed", "extra", "missed"]);
  });

  it("evaluates each day with the version in effect on that day", () => {
    const h = history(
      "2026-10-01",
      [
        { effectiveFrom: "2026-10-01", target: 20, weekdays: EVERY_DAY },
        { effectiveFrom: "2026-10-03", target: 30, weekdays: EVERY_DAY },
      ],
      { "2026-10-02": 20, "2026-10-03": 20 },
    );
    const days = evaluateDays(h, d("2026-10-02"), d("2026-10-03"), d("2026-10-04"));
    expect(days.map((day) => [day.kind, day.target])).toEqual([
      ["done", 20],
      ["partial", 30],
    ]);
  });

  it("shows skipped days as neutral", () => {
    const h = history("2026-10-01", daily, { "2026-10-02": "skip" });
    const [day] = evaluateDays(h, d("2026-10-02"), d("2026-10-02"), d("2026-10-03"));
    expect(day).toMatchObject({ kind: "skipped", level: 0 });
  });
});

describe("computeStats", () => {
  const daily = [{ effectiveFrom: "2026-10-01", target: 1, weekdays: EVERY_DAY }];

  it("does not break the streak while today is still open", () => {
    const h = history("2026-10-01", daily, { "2026-10-01": 1, "2026-10-02": 1, "2026-10-03": 1 });
    expect(computeStats(h, d("2026-10-04"), d("2026-10-01"))).toMatchObject({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it("resets the streak after a missed or partial day and keeps the record", () => {
    const h = history("2026-10-01", daily, {
      "2026-10-01": 1,
      "2026-10-02": 1,
      "2026-10-03": 1,
      "2026-10-05": 1,
    });
    expect(computeStats(h, d("2026-10-05"), d("2026-10-01"))).toMatchObject({
      currentStreak: 1,
      longestStreak: 3,
    });
  });

  it("skips over skipped and off-schedule days without breaking or adding", () => {
    const mwf = weekdaysFromList([1, 3, 5]);
    // Mon 5 done, Tue 6 off, Wed 7 skipped, Thu 8 off, Fri 9 done.
    const h = history("2026-10-05", [{ effectiveFrom: "2026-10-05", target: 1, weekdays: mwf }], {
      "2026-10-05": 1,
      "2026-10-07": "skip",
      "2026-10-09": 1,
    });
    expect(computeStats(h, d("2026-10-09"), d("2026-10-05"))).toMatchObject({
      currentStreak: 2,
      completionRate: 1,
    });
  });

  it("counts today in the rate only once it is done", () => {
    const h = history("2026-10-01", daily, { "2026-10-01": 1 });
    expect(computeStats(h, d("2026-10-02"), d("2026-10-01"))).toMatchObject({
      doneDays: 1,
      measuredDays: 1,
      completionRate: 1,
    });

    const doneToday = history("2026-10-01", daily, { "2026-10-01": 1, "2026-10-02": 1 });
    expect(computeStats(doneToday, d("2026-10-02"), d("2026-10-01"))).toMatchObject({
      doneDays: 2,
      measuredDays: 2,
    });
  });

  it("limits the rate to the window but streaks to the whole history", () => {
    const h = history("2026-10-01", daily, { "2026-10-01": 1, "2026-10-02": 1, "2026-10-04": 1 });
    expect(computeStats(h, d("2026-10-05"), d("2026-10-03"))).toMatchObject({
      longestStreak: 2,
      doneDays: 1,
      measuredDays: 2,
      completionRate: 0.5,
    });
  });

  it("has nothing to measure before the habit starts", () => {
    const h = history("2026-10-14", daily);
    expect(computeStats(h, d("2026-10-13"), d("2026-10-01"))).toMatchObject({
      currentStreak: 0,
      completionRate: null,
    });
  });
});
