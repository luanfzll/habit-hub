import type { CalendarDate } from "./calendar-date";

export const MAX_TASK_TITLE = 120;
export const MAX_PENDING_TASKS = 50;

export interface TaskRecord {
  id: string;
  title: string;
  createdFor: CalendarDate;
  completedOn: CalendarDate | null;
  /** ISO timestamp, breaks ties between tasks created on the same day. */
  createdAt: string;
}

/**
 * Tasks shown on `today`: every pending task, whatever day it was created for
 * (unfinished tasks carry over), plus the ones completed today. Oldest first, so
 * tasks carried over from earlier days stay on top.
 */
export function tasksForToday(tasks: readonly TaskRecord[], today: CalendarDate): TaskRecord[] {
  return tasks
    .filter((task) => task.completedOn === null || task.completedOn === today)
    .sort((a, b) =>
      a.createdFor === b.createdFor ? a.createdAt.localeCompare(b.createdAt) : a.createdFor < b.createdFor ? -1 : 1,
    );
}

/** The day a pending task has been waiting since, when that is before today. */
export function pendingSince(task: TaskRecord, today: CalendarDate): CalendarDate | null {
  return task.completedOn === null && task.createdFor < today ? task.createdFor : null;
}
