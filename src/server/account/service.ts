import "server-only";
import { weekdaysToList } from "@/domain/habit-config";
import { db } from "../db";
import { fromDbDate } from "../db-dates";

/** Raise when the format changes in a way an importer would need to know about. */
export const EXPORT_FORMAT_VERSION = 1;

/**
 * Everything the person put into the app, in a format meant to be read back one day.
 * Leaves out what only serves the app itself: password hash, sessions, pending
 * verification codes and internal ids.
 */
export async function exportAccount(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      habits: {
        orderBy: { createdAt: "asc" },
        include: { versions: { orderBy: { effectiveFrom: "asc" } }, entries: { orderBy: { date: "asc" } } },
      },
      tasks: { orderBy: { createdAt: "asc" } },
    },
  });

  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    account: {
      email: user.email,
      emailVerified: user.emailVerified,
      username: user.username,
      timezone: user.timezone,
      createdAt: user.createdAt.toISOString(),
    },
    habits: user.habits.map((habit) => ({
      name: habit.name,
      color: habit.color,
      unit: habit.unit,
      isPublic: habit.isPublic,
      /** Code in the README image address. */
      publicId: habit.publicId,
      startDate: fromDbDate(habit.startDate),
      archivedAt: habit.archivedAt?.toISOString() ?? null,
      createdAt: habit.createdAt.toISOString(),
      /** Target and schedule over time; weekdays go from 0 (Sunday) to 6. */
      versions: habit.versions.map((version) => ({
        effectiveFrom: fromDbDate(version.effectiveFrom),
        target: version.target,
        weekdays: weekdaysToList(version.weekdays),
      })),
      entries: habit.entries.map((entry) => ({
        date: fromDbDate(entry.date),
        value: entry.value,
        skipped: entry.skipped,
        skipReason: entry.skipReason,
      })),
    })),
    tasks: user.tasks.map((task) => ({
      title: task.title,
      createdFor: fromDbDate(task.createdFor),
      completedOn: task.completedOn ? fromDbDate(task.completedOn) : null,
      createdAt: task.createdAt.toISOString(),
    })),
  };
}

export type AccountExport = Awaited<ReturnType<typeof exportAccount>>;

/**
 * Deletes the account and everything in it at once: habits, entries, tasks, sessions and
 * linked logins go with the user row (ON DELETE CASCADE). Pending password reset tokens
 * only point at the user by id, so they are removed here. The username is freed and
 * README images of its habits start showing "Hábito indisponível".
 */
export async function deleteAccount(userId: string) {
  await db.$transaction([
    db.verification.deleteMany({ where: { identifier: { startsWith: "reset-password:" }, value: userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);
}
