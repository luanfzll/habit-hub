import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "@/domain/calendar-date";
import { createUser } from "../../../tests/support/factories";
import { db } from "../db";
import { archiveHabit, createHabit, setEntry } from "../habits/service";
import { getEmbedHabit, getPublicProfile, setHabitPublic, setUsername } from "../public/service";
import { createTask } from "../tasks/service";
import { deleteAccount, EXPORT_FORMAT_VERSION, exportAccount } from "./service";

const today = parseCalendarDate("2026-10-14");
const habit = { name: "Ler", color: "green", unit: "páginas", target: 10, weekdays: 0b0101010 } as const;

async function userWithData() {
  const user = await createUser();
  await db.account.create({
    data: { id: randomUUID(), userId: user.id, providerId: "credential", accountId: user.id, password: "hash-secreto" },
  });
  await db.session.create({
    data: { id: randomUUID(), userId: user.id, token: `token-${randomUUID()}`, expiresAt: new Date(Date.now() + 1e9) },
  });
  const read = await createHabit(user.id, habit, today);
  await setEntry(user.id, read.id, today, { value: 4 }, today);
  const old = await createHabit(user.id, { ...habit, name: "Correr", unit: null, target: 1 }, today);
  await archiveHabit(user.id, old.id);
  await createTask(user.id, "Pagar a conta de luz", today);
  return { user, read };
}

describe("data export", () => {
  it("has the account, every habit (archived too), the entries and the tasks", async () => {
    const { user } = await userWithData();
    const data = await exportAccount(user.id);

    expect(data.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(data.account).toMatchObject({ email: user.email, timezone: "America/Sao_Paulo", username: null });
    expect(data.habits.map((h) => [h.name, h.archivedAt !== null])).toEqual([
      ["Ler", false],
      ["Correr", true],
    ]);
    expect(data.habits[0].versions).toEqual([{ effectiveFrom: "2026-10-14", target: 10, weekdays: [1, 3, 5] }]);
    expect(data.habits[0].entries).toEqual([{ date: "2026-10-14", value: 4, skipped: false, skipReason: null }]);
    expect(data.tasks).toMatchObject([{ title: "Pagar a conta de luz", createdFor: "2026-10-14", completedOn: null }]);
  });

  it("leaves out the password hash, sessions and internal ids", async () => {
    const { user, read } = await userWithData();
    const json = JSON.stringify(await exportAccount(user.id));
    expect(json).not.toContain("hash-secreto");
    expect(json).not.toContain("token-");
    expect(json).not.toMatch(/"(id|userId|habitId)":/);
    expect(json).not.toContain(read.id);
  });
});

describe("account deletion", () => {
  it("removes everything, frees the username and hides the README images", async () => {
    const { user, read } = await userWithData();
    await setUsername(user.id, "quem-sai");
    await setHabitPublic({ id: user.id, emailVerified: true }, read.id, true);
    const { publicId } = (await getPublicProfile("quem-sai"))!.habits[0];
    await db.verification.create({
      data: { id: randomUUID(), identifier: `reset-password:${randomUUID()}`, value: user.id, expiresAt: new Date() },
    });

    await deleteAccount(user.id);

    const where = { userId: user.id };
    expect(await db.user.count({ where: { id: user.id } })).toBe(0);
    expect(await db.habit.count({ where })).toBe(0);
    expect(await db.habitEntry.count({ where: { habitId: read.id } })).toBe(0);
    expect(await db.task.count({ where })).toBe(0);
    expect(await db.session.count({ where })).toBe(0);
    expect(await db.account.count({ where })).toBe(0);
    expect(await db.verification.count({ where: { value: user.id } })).toBe(0);
    expect(await getEmbedHabit(publicId)).toBeNull();

    const someoneElse = await createUser();
    expect(await setUsername(someoneElse.id, "quem-sai")).toBe("quem-sai");
  });

  it("leaves other accounts alone", async () => {
    const { user } = await userWithData();
    const other = await userWithData();
    await deleteAccount(user.id);
    expect((await exportAccount(other.user.id)).habits).toHaveLength(2);
  });
});
