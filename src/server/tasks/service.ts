import "server-only";
import type { CalendarDate } from "@/domain/calendar-date";
import { MAX_PENDING_TASKS, tasksForToday, type TaskRecord } from "@/domain/tasks";
import { db } from "../db";
import { fromDbDate, toDbDate } from "../db-dates";

export class TaskNotFoundError extends Error {}
export class TaskLimitError extends Error {}

/** Pending tasks from any day plus the ones completed today, oldest first. */
export async function listTodayTasks(userId: string, today: CalendarDate): Promise<TaskRecord[]> {
  const rows = await db.task.findMany({
    where: { userId, OR: [{ completedOn: null }, { completedOn: toDbDate(today) }] },
  });
  return tasksForToday(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      createdFor: fromDbDate(row.createdFor),
      completedOn: row.completedOn ? fromDbDate(row.completedOn) : null,
      createdAt: row.createdAt.toISOString(),
    })),
    today,
  );
}

export async function createTask(userId: string, title: string, today: CalendarDate) {
  return db.$transaction(async (tx) => {
    const pending = await tx.task.count({ where: { userId, completedOn: null } });
    if (pending >= MAX_PENDING_TASKS) throw new TaskLimitError();
    return tx.task.create({ data: { userId, title, createdFor: toDbDate(today) }, select: { id: true } });
  });
}

export async function setTaskDone(userId: string, taskId: string, done: boolean, today: CalendarDate) {
  const { count } = await db.task.updateMany({
    where: { id: taskId, userId },
    data: { completedOn: done ? toDbDate(today) : null },
  });
  if (count === 0) throw new TaskNotFoundError();
}

export async function deleteTask(userId: string, taskId: string) {
  const { count } = await db.task.deleteMany({ where: { id: taskId, userId } });
  if (count === 0) throw new TaskNotFoundError();
}
