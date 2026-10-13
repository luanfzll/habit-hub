import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "./calendar-date";
import { buildGrid, gridStart } from "./grid";
import { EVERY_DAY } from "./habit-config";

const d = parseCalendarDate;

const history = {
  startDate: d("2026-10-01"),
  versions: [{ effectiveFrom: d("2026-10-01"), target: 1, weekdays: EVERY_DAY }],
  entries: new Map([[d("2026-10-12"), { value: 1, skipped: false }]]),
};

describe("buildGrid", () => {
  // Tuesday
  const today = d("2026-10-13");

  it("ends on the week of today and starts on a Sunday 52 weeks earlier", () => {
    expect(gridStart({ today })).toBe("2025-10-12");
    const grid = buildGrid(history, { today });
    expect(grid.columns).toHaveLength(53);
    expect(grid.columns[0][0]?.date).toBe("2025-10-12");
  });

  it("does not draw days after today", () => {
    const lastColumn = buildGrid(history, { today }).columns[52];
    expect(lastColumn.map((day) => day?.date ?? null)).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      null,
      null,
      null,
      null,
    ]);
  });

  it("carries the state of each day", () => {
    const lastColumn = buildGrid(history, { today }).columns[52];
    expect(lastColumn[1]).toMatchObject({ kind: "done", level: 4 });
    expect(lastColumn[2]).toMatchObject({ kind: "pending", isToday: true });
    expect(buildGrid(history, { today }).columns[0][0]?.kind).toBe("before-start");
  });

  it("supports other week starts and lengths", () => {
    const grid = buildGrid(history, { today, weeks: 20, weekStartsOn: 1 });
    expect(grid.columns).toHaveLength(20);
    expect(grid.columns[0][0]?.date).toBe("2026-06-01");
  });

  it("labels each month once, on the column holding its first day", () => {
    const { months } = buildGrid(history, { today });
    // October 2025 only has two columns before November starts, too narrow for a label.
    expect(months.map((label) => label.month)).toEqual([11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(months[0].column).toBe(2);
  });

  it("labels the partial first month when it has room", () => {
    const { months } = buildGrid(history, { today: d("2026-10-06") });
    expect(months[0]).toEqual({ column: 0, month: 10 });
  });
});
