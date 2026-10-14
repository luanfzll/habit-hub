import { afterEach, describe, expect, it } from "vitest";
import { addDays, parseCalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY, MAX_PUBLIC_HABITS } from "@/domain/habit-config";
import { createUser } from "../../../tests/support/factories";
import { archiveHabit, createHabit, setEntry } from "../habits/service";
import {
  EmailNotVerifiedError,
  getEmbedHabit,
  getPublicProfile,
  PublicLimitError,
  setHabitPublic,
  setUsername,
  UsernameInvalidError,
  UsernameRequiredError,
  UsernameTakenError,
} from "./service";

const today = parseCalendarDate("2026-10-14");
const habit = { name: "Programar", color: "green", unit: null, target: 1, weekdays: EVERY_DAY } as const;
const originalAllowlist = process.env.SIGNUP_ALLOWLIST;

afterEach(() => {
  process.env.SIGNUP_ALLOWLIST = originalAllowlist;
});

async function publisher(username = `u${Math.random().toString(36).slice(2, 10)}`) {
  const user = await createUser();
  await setUsername(user.id, username);
  return { ...user, emailVerified: true };
}

describe("usernames", () => {
  it("are stored lowercase and unique regardless of case", async () => {
    const first = await createUser();
    const second = await createUser();
    expect(await setUsername(first.id, "  Luan-Dev ")).toBe("luan-dev");
    await expect(setUsername(second.id, "LUAN-DEV")).rejects.toThrow(UsernameTakenError);
  });

  it("reject bad formats and reserved names", async () => {
    const user = await createUser();
    await expect(setUsername(user.id, "a")).rejects.toThrow(UsernameInvalidError);
    await expect(setUsername(user.id, "habithub")).rejects.toThrow(UsernameInvalidError);
  });
});

describe("publishing", () => {
  it("needs a username first", async () => {
    const user = await createUser();
    const { id } = await createHabit(user.id, habit, today);
    await expect(setHabitPublic({ id: user.id, emailVerified: true }, id, true)).rejects.toThrow(UsernameRequiredError);
  });

  it(`allows at most ${MAX_PUBLIC_HABITS} public habits`, async () => {
    const user = await publisher();
    const ids = [];
    for (let i = 0; i <= MAX_PUBLIC_HABITS; i++) {
      ids.push((await createHabit(user.id, { ...habit, name: `Hábito ${i}` }, today)).id);
    }
    for (const id of ids.slice(0, MAX_PUBLIC_HABITS)) await setHabitPublic(user, id, true);
    await expect(setHabitPublic(user, ids[MAX_PUBLIC_HABITS], true)).rejects.toThrow(PublicLimitError);

    // Archiving makes a habit private, which frees its slot.
    await archiveHabit(user.id, ids[0]);
    await setHabitPublic(user, ids[MAX_PUBLIC_HABITS], true);
  });

  it("requires a confirmed e-mail once sign-ups are open to everyone", async () => {
    const user = await publisher();
    const { id } = await createHabit(user.id, habit, today);
    process.env.SIGNUP_ALLOWLIST = "*";
    await expect(setHabitPublic({ ...user, emailVerified: false }, id, true)).rejects.toThrow(EmailNotVerifiedError);
    process.env.SIGNUP_ALLOWLIST = user.email;
    await setHabitPublic({ ...user, emailVerified: false }, id, true);
  });
});

describe("public profile and README image", () => {
  it("show only public, active habits and never the reasons for skipped days", async () => {
    const user = await publisher("luan");
    const shown = await createHabit(user.id, habit, addDays(today, -3));
    await createHabit(user.id, { ...habit, name: "Particular" }, today);
    await setEntry(user.id, shown.id, addDays(today, -1), { skip: true, reason: "Consulta médica" }, today);
    await setHabitPublic(user, shown.id, true);

    const profile = await getPublicProfile("LUAN");
    expect(profile?.habits.map((h) => h.name)).toEqual(["Programar"]);
    expect(profile?.habits[0].id).not.toBe(shown.id);
    expect(profile?.habits[0].entries).toEqual([{ date: "2026-10-13", value: 0, skipped: true, skipReason: null }]);

    const embed = await getEmbedHabit(profile!.habits[0].publicId);
    expect(embed?.habit.entries[0].skipReason).toBeNull();
    expect(embed?.timezone).toBe("America/Sao_Paulo");
  });

  it("hide everything once nothing is public, without revealing that the user exists", async () => {
    const user = await publisher("ana");
    const { id } = await createHabit(user.id, habit, today);
    await setHabitPublic(user, id, true);
    const { publicId } = (await getPublicProfile("ana"))!.habits[0];

    await setHabitPublic(user, id, false);
    expect(await getPublicProfile("ana")).toBeNull();
    expect(await getPublicProfile("ninguem")).toBeNull();
    expect(await getEmbedHabit(publicId)).toBeNull();
  });
});
