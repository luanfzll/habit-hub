import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "./calendar-date";
import { pendingSince, tasksForToday, type TaskRecord } from "./tasks";

const d = parseCalendarDate;
const today = d("2026-10-14");

function task(id: string, createdFor: string, completedOn: string | null = null, createdAt = "2026-10-01T10:00:00Z") {
  return { id, title: id, createdFor: d(createdFor), completedOn: completedOn ? d(completedOn) : null, createdAt };
}

describe("tasksForToday", () => {
  it("carries pending tasks over from earlier days", () => {
    const tasks = [task("old", "2026-10-10"), task("new", "2026-10-14")];
    expect(tasksForToday(tasks, today).map((t) => t.id)).toEqual(["old", "new"]);
  });

  it("keeps tasks done today visible and hides the ones done before", () => {
    const tasks = [task("done-today", "2026-10-12", "2026-10-14"), task("done-yesterday", "2026-10-13", "2026-10-13")];
    expect(tasksForToday(tasks, today).map((t) => t.id)).toEqual(["done-today"]);
  });

  it("orders by day, then by creation time", () => {
    const tasks: TaskRecord[] = [
      task("b", "2026-10-14", null, "2026-10-14T09:00:00Z"),
      task("a", "2026-10-14", null, "2026-10-14T08:00:00Z"),
      task("older", "2026-10-11"),
    ];
    expect(tasksForToday(tasks, today).map((t) => t.id)).toEqual(["older", "a", "b"]);
  });
});

describe("pendingSince", () => {
  it("tells since when a carried-over task is waiting", () => {
    expect(pendingSince(task("x", "2026-10-12"), today)).toBe("2026-10-12");
  });

  it("is empty for today's tasks and for done tasks", () => {
    expect(pendingSince(task("x", "2026-10-14"), today)).toBeNull();
    expect(pendingSince(task("x", "2026-10-12", "2026-10-14"), today)).toBeNull();
  });
});
