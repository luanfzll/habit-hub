import "server-only";
import { addDays, maxDate, type CalendarDate } from "@/domain/calendar-date";
import { isEditableDay, type DayEntry } from "@/domain/day-state";
import { configOn, MAX_ACTIVE_HABITS, sortVersions, type ConfigVersion } from "@/domain/habit-config";
import type { HabitColor } from "@/generated/prisma/enums";
import { db } from "../db";
import { fromDbDate, toDbDate } from "../db-dates";
import type { EntryChange, HabitInput } from "./input";

export class HabitNotFoundError extends Error {}
export class HabitLimitError extends Error {}
export class DayNotEditableError extends Error {}

/** Serializable habit with everything the grid and the stats need. */
export interface HabitView {
  id: string;
  name: string;
  color: HabitColor;
  unit: string | null;
  startDate: CalendarDate;
  versions: ConfigVersion[];
  entries: Array<{ date: CalendarDate } & DayEntry>;
}

const PUBLIC_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** 10 random characters from an alphabet without look-alikes (0/o, 1/l). */
export function newPublicId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length]).join("");
}

function toVersion(row: { effectiveFrom: Date; target: number; weekdays: number }): ConfigVersion {
  return { effectiveFrom: fromDbDate(row.effectiveFrom), target: row.target, weekdays: row.weekdays };
}

/** Active habits in creation order. */
export async function listActiveHabits(userId: string): Promise<HabitView[]> {
  const habits = await db.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { versions: true, entries: true },
  });
  return habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    color: habit.color,
    unit: habit.unit,
    startDate: fromDbDate(habit.startDate),
    versions: sortVersions(habit.versions.map(toVersion)),
    entries: habit.entries.map((entry) => ({
      date: fromDbDate(entry.date),
      value: entry.value,
      skipped: entry.skipped,
    })),
  }));
}

/** Values for the edit form: name, color, unit and the configuration in effect today. */
export async function getHabitForEdit(userId: string, habitId: string, today: CalendarDate) {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: { versions: true },
  });
  if (!habit) throw new HabitNotFoundError();
  const startDate = fromDbDate(habit.startDate);
  const config = configOn(sortVersions(habit.versions.map(toVersion)), maxDate(today, startDate));
  if (!config) throw new HabitNotFoundError();
  return {
    id: habit.id,
    name: habit.name,
    color: habit.color,
    unit: habit.unit,
    target: config.target,
    weekdays: config.weekdays,
  };
}

export async function createHabit(userId: string, input: HabitInput, today: CalendarDate) {
  return db.$transaction(async (tx) => {
    const active = await tx.habit.count({ where: { userId, archivedAt: null } });
    if (active >= MAX_ACTIVE_HABITS) throw new HabitLimitError();

    return tx.habit.create({
      data: {
        userId,
        publicId: newPublicId(),
        name: input.name,
        color: input.color,
        unit: input.unit,
        startDate: toDbDate(today),
        versions: {
          create: { effectiveFrom: toDbDate(today), target: input.target, weekdays: input.weekdays },
        },
      },
      select: { id: true },
    });
  });
}

/**
 * Name, color and unit change in place. Target and schedule changes create a version
 * that applies from today on; several changes on the same day replace today's version,
 * and changing back to the previous values removes it.
 */
export async function updateHabit(userId: string, habitId: string, input: HabitInput, today: CalendarDate) {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: { versions: true },
  });
  if (!habit) throw new HabitNotFoundError();

  // A habit can start "tomorrow" after a time zone change; its first version still rules.
  const effectiveFrom = maxDate(today, fromDbDate(habit.startDate));
  const versions = sortVersions(habit.versions.map(toVersion));
  const current = configOn(versions, effectiveFrom);
  const previous = configOn(
    versions.filter((version) => version.effectiveFrom !== effectiveFrom),
    addDays(effectiveFrom, -1),
  );
  const sameAs = (version: ConfigVersion | undefined) =>
    version?.target === input.target && version?.weekdays === input.weekdays;

  await db.$transaction(async (tx) => {
    await tx.habit.update({
      where: { id: habit.id },
      data: { name: input.name, color: input.color, unit: input.unit },
    });

    if (sameAs(current)) return;

    const key = { habitId_effectiveFrom: { habitId: habit.id, effectiveFrom: toDbDate(effectiveFrom) } };
    if (sameAs(previous)) {
      await tx.habitConfigVersion.delete({ where: key });
    } else {
      await tx.habitConfigVersion.upsert({
        where: key,
        create: {
          habitId: habit.id,
          effectiveFrom: toDbDate(effectiveFrom),
          target: input.target,
          weekdays: input.weekdays,
        },
        update: { target: input.target, weekdays: input.weekdays },
      });
    }
  });
}

/** Registers a value (0 clears the day) or skips the day. Skipping discards any value. */
export async function setEntry(
  userId: string,
  habitId: string,
  date: CalendarDate,
  change: EntryChange,
  today: CalendarDate,
) {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    select: { id: true, startDate: true },
  });
  if (!habit) throw new HabitNotFoundError();
  if (!isEditableDay(date, fromDbDate(habit.startDate), today)) throw new DayNotEditableError();

  const key = { habitId_date: { habitId: habit.id, date: toDbDate(date) } };
  const data = "skip" in change ? { value: 0, skipped: true } : { value: change.value, skipped: false };

  if (!data.skipped && data.value === 0) {
    await db.habitEntry.deleteMany({ where: { habitId: habit.id, date: toDbDate(date) } });
    return;
  }
  await db.habitEntry.upsert({
    where: key,
    create: { habitId: habit.id, date: toDbDate(date), ...data },
    update: data,
  });
}
