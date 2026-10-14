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
  /** Id used in the README image URL. */
  publicId: string;
  isPublic: boolean;
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

type HabitRow = {
  id: string;
  publicId: string;
  isPublic: boolean;
  name: string;
  color: HabitColor;
  unit: string | null;
  startDate: Date;
  versions: { effectiveFrom: Date; target: number; weekdays: number }[];
  entries: { date: Date; value: number; skipped: boolean; skipReason: string | null }[];
};

export function toHabitView(habit: HabitRow): HabitView {
  return {
    id: habit.id,
    publicId: habit.publicId,
    isPublic: habit.isPublic,
    name: habit.name,
    color: habit.color,
    unit: habit.unit,
    startDate: fromDbDate(habit.startDate),
    versions: sortVersions(habit.versions.map(toVersion)),
    entries: habit.entries.map((entry) => ({
      date: fromDbDate(entry.date),
      value: entry.value,
      skipped: entry.skipped,
      skipReason: entry.skipReason,
    })),
  };
}

/** Active habits in creation order. */
export async function listActiveHabits(userId: string): Promise<HabitView[]> {
  const habits = await db.habit.findMany({
    where: { userId, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { versions: true, entries: true },
  });
  return habits.map(toHabitView);
}

/** One active habit, for its own page. */
export async function getHabitView(userId: string, habitId: string): Promise<HabitView> {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: { versions: true, entries: true },
  });
  if (!habit) throw new HabitNotFoundError();
  return toHabitView(habit);
}

export async function listArchivedHabits(userId: string) {
  return db.habit.findMany({
    where: { userId, archivedAt: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true, archivedAt: true },
  });
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

/**
 * Registers a value (0 clears the day) or skips the day, with an optional reason.
 * Skipping discards any value; registering a value un-skips the day and drops the reason.
 * Skipping an already skipped day only updates its reason.
 */
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
  const data =
    "skip" in change
      ? { value: 0, skipped: true, skipReason: change.reason ?? null }
      : { value: change.value, skipped: false, skipReason: null };

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

/**
 * Archiving only hides the habit. Its days keep counting as empty days, so the
 * streak breaks and the rate drops exactly as if the habit had not been done.
 */
export async function archiveHabit(userId: string, habitId: string) {
  const { count } = await db.habit.updateMany({
    where: { id: habitId, userId, archivedAt: null },
    // An archived habit also leaves the public profile, so it never takes a public slot.
    data: { archivedAt: new Date(), isPublic: false },
  });
  if (count === 0) throw new HabitNotFoundError();
}

export async function unarchiveHabit(userId: string, habitId: string) {
  await db.$transaction(async (tx) => {
    const habit = await tx.habit.findFirst({
      where: { id: habitId, userId, archivedAt: { not: null } },
      select: { id: true },
    });
    if (!habit) throw new HabitNotFoundError();
    const active = await tx.habit.count({ where: { userId, archivedAt: null } });
    if (active >= MAX_ACTIVE_HABITS) throw new HabitLimitError();
    await tx.habit.update({ where: { id: habit.id }, data: { archivedAt: null } });
  });
}

/** Deletes the habit with its versions and entries. Works for active and archived habits. */
export async function deleteHabit(userId: string, habitId: string) {
  const { count } = await db.habit.deleteMany({ where: { id: habitId, userId } });
  if (count === 0) throw new HabitNotFoundError();
}
