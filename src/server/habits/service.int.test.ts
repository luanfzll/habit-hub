import { describe, expect, it } from "vitest";
import { addDays, parseCalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY, MAX_ACTIVE_HABITS, weekdaysFromList } from "@/domain/habit-config";
import { db } from "@/server/db";
import { toDbDate } from "@/server/db-dates";
import { createUser } from "../../../tests/support/factories";
import {
  archiveHabit,
  createHabit,
  DayNotEditableError,
  deleteHabit,
  getHabitForEdit,
  getHabitView,
  HabitLimitError,
  HabitNotFoundError,
  listActiveHabits,
  listArchivedHabits,
  setEntry,
  unarchiveHabit,
  updateHabit,
} from "./service";

const today = parseCalendarDate("2026-10-13");
const reading = { name: "Ler", color: "green", unit: "páginas", target: 20, weekdays: EVERY_DAY } as const;

describe("dates", () => {
  it("round-trip through the database without shifting, whatever the server time zone", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);
    await setEntry(user.id, id, today, { value: 5 }, today);

    const [habit] = await listActiveHabits(user.id);
    expect(habit.startDate).toBe("2026-10-13");
    expect(habit.versions[0].effectiveFrom).toBe("2026-10-13");
    expect(habit.entries).toEqual([{ date: "2026-10-13", value: 5, skipped: false }]);

    const rows = await db.$queryRaw<{ date: string }[]>`
      SELECT to_char(date, 'YYYY-MM-DD') AS date FROM habit_entries`;
    expect(rows).toEqual([{ date: "2026-10-13" }]);
  });
});

describe("ownership", () => {
  it("never lets one person read or change another person's habit", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { id } = await createHabit(owner.id, reading, today);

    await expect(setEntry(stranger.id, id, today, { value: 3 }, today)).rejects.toThrow(HabitNotFoundError);
    await expect(updateHabit(stranger.id, id, { ...reading, name: "X" }, today)).rejects.toThrow(HabitNotFoundError);
    await expect(getHabitForEdit(stranger.id, id, today)).rejects.toThrow(HabitNotFoundError);
    expect(await listActiveHabits(stranger.id)).toEqual([]);

    const [habit] = await listActiveHabits(owner.id);
    expect(habit).toMatchObject({ name: "Ler", entries: [] });
  });
});

describe("entries", () => {
  it("keeps one row per day and deletes it when the value goes back to 0", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);

    await setEntry(user.id, id, today, { value: 5 }, today);
    await setEntry(user.id, id, today, { value: 12 }, today);
    expect((await listActiveHabits(user.id))[0].entries).toEqual([{ date: today, value: 12, skipped: false }]);

    await setEntry(user.id, id, today, { value: 0 }, today);
    expect((await listActiveHabits(user.id))[0].entries).toEqual([]);
  });

  it("discards the value when a day is skipped", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);
    await setEntry(user.id, id, today, { value: 5 }, today);
    await setEntry(user.id, id, today, { skip: true }, today);
    expect((await listActiveHabits(user.id))[0].entries).toEqual([{ date: today, value: 0, skipped: true }]);
  });

  it("rejects days before the start and after today", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);
    await expect(setEntry(user.id, id, addDays(today, -1), { value: 1 }, today)).rejects.toThrow(DayNotEditableError);
    await expect(setEntry(user.id, id, addDays(today, 1), { value: 1 }, today)).rejects.toThrow(DayNotEditableError);
  });

  it("is protected by the database against a skipped day with a value", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);
    await expect(
      db.habitEntry.create({ data: { habitId: id, date: toDbDate(today), value: 3, skipped: true } }),
    ).rejects.toThrow();
  });
});

describe("configuration versions", () => {
  async function versionsOf(userId: string) {
    return (await listActiveHabits(userId))[0].versions;
  }

  it("changes the first version in place on the day the habit is created", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, today);
    await updateHabit(user.id, id, { ...reading, target: 30 }, today);
    expect(await versionsOf(user.id)).toEqual([{ effectiveFrom: today, target: 30, weekdays: EVERY_DAY }]);
  });

  it("adds a version from today on, replaces it on the same day and removes it when reverted", async () => {
    const user = await createUser();
    const start = addDays(today, -10);
    const { id } = await createHabit(user.id, reading, start);
    const mwf = weekdaysFromList([1, 3, 5]);

    await updateHabit(user.id, id, { ...reading, target: 30 }, today);
    await updateHabit(user.id, id, { ...reading, target: 30, weekdays: mwf }, today);
    expect(await versionsOf(user.id)).toEqual([
      { effectiveFrom: start, target: 20, weekdays: EVERY_DAY },
      { effectiveFrom: today, target: 30, weekdays: mwf },
    ]);

    await updateHabit(user.id, id, reading, today);
    expect(await versionsOf(user.id)).toEqual([{ effectiveFrom: start, target: 20, weekdays: EVERY_DAY }]);
  });

  it("does not create a version when only the name changes", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, reading, addDays(today, -3));
    await updateHabit(user.id, id, { ...reading, name: "Leitura" }, today);
    const [habit] = await listActiveHabits(user.id);
    expect(habit.name).toBe("Leitura");
    expect(habit.versions).toHaveLength(1);
  });
});

describe("limits", () => {
  it(`allows at most ${MAX_ACTIVE_HABITS} active habits`, async () => {
    const user = await createUser();
    for (let i = 0; i < MAX_ACTIVE_HABITS; i++) {
      await createHabit(user.id, { ...reading, name: `Hábito ${i}` }, today);
    }
    await expect(createHabit(user.id, reading, today)).rejects.toThrow(HabitLimitError);
  });
});

describe("archive and delete", () => {
  it("hides archived habits, keeps their history and restores them in their original place", async () => {
    const user = await createUser();
    const first = await createHabit(user.id, { ...reading, name: "Primeiro" }, today);
    await createHabit(user.id, { ...reading, name: "Segundo" }, today);
    await setEntry(user.id, first.id, today, { value: 4 }, today);

    await archiveHabit(user.id, first.id);
    expect((await listActiveHabits(user.id)).map((habit) => habit.name)).toEqual(["Segundo"]);
    expect((await listArchivedHabits(user.id)).map((habit) => habit.name)).toEqual(["Primeiro"]);
    await expect(getHabitView(user.id, first.id)).rejects.toThrow(HabitNotFoundError);
    await expect(setEntry(user.id, first.id, today, { value: 1 }, today)).rejects.toThrow(HabitNotFoundError);

    await unarchiveHabit(user.id, first.id);
    const habits = await listActiveHabits(user.id);
    expect(habits.map((habit) => habit.name)).toEqual(["Primeiro", "Segundo"]);
    expect(habits[0].entries).toEqual([{ date: today, value: 4, skipped: false }]);
  });

  it("refuses to unarchive beyond the active limit", async () => {
    const user = await createUser();
    const archived = await createHabit(user.id, reading, today);
    await archiveHabit(user.id, archived.id);
    for (let i = 0; i < MAX_ACTIVE_HABITS; i++) {
      await createHabit(user.id, { ...reading, name: `Hábito ${i}` }, today);
    }
    await expect(unarchiveHabit(user.id, archived.id)).rejects.toThrow(HabitLimitError);
  });

  it("deletes a habit with all its data, only for its owner", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { id } = await createHabit(owner.id, reading, today);
    await setEntry(owner.id, id, today, { value: 2 }, today);

    await expect(deleteHabit(stranger.id, id)).rejects.toThrow(HabitNotFoundError);
    await expect(archiveHabit(stranger.id, id)).rejects.toThrow(HabitNotFoundError);

    await deleteHabit(owner.id, id);
    expect(await listActiveHabits(owner.id)).toEqual([]);
    expect(await db.habitEntry.count()).toBe(0);
    expect(await db.habitConfigVersion.count()).toBe(0);
  });
});
