import "server-only";
import { MAX_PUBLIC_HABITS } from "@/domain/habit-config";
import { normalizeUsername, usernameProblem, type UsernameProblem } from "@/domain/username";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { HabitNotFoundError, toHabitView, type HabitView } from "../habits/service";
import { isSignupOpenToEveryone } from "../signup-policy";

export class UsernameInvalidError extends Error {
  constructor(readonly problem: UsernameProblem) {
    super(problem);
  }
}
export class UsernameTakenError extends Error {}
export class UsernameRequiredError extends Error {}
export class PublicLimitError extends Error {}
export class EmailNotVerifiedError extends Error {}

export async function getUsername(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user?.username ?? null;
}

/** Changing the name frees the old one at once; old profile links stop working, README images do not. */
export async function setUsername(userId: string, raw: string): Promise<string> {
  const username = normalizeUsername(raw);
  const problem = usernameProblem(username);
  if (problem) throw new UsernameInvalidError(problem);
  try {
    await db.user.update({ where: { id: userId }, data: { username } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new UsernameTakenError();
    }
    throw error;
  }
  return username;
}

/**
 * Publishing needs a username and at most MAX_PUBLIC_HABITS public habits. A confirmed
 * e-mail is required once sign-ups are open to everyone; while they are closed, only
 * listed e-mails have accounts, so there are no throwaway profiles to stop.
 */
export async function setHabitPublic(user: { id: string; emailVerified: boolean }, habitId: string, isPublic: boolean) {
  if (!isPublic) {
    const { count } = await db.habit.updateMany({ where: { id: habitId, userId: user.id }, data: { isPublic: false } });
    if (count === 0) throw new HabitNotFoundError();
    return;
  }

  if (!user.emailVerified && isSignupOpenToEveryone()) throw new EmailNotVerifiedError();
  if (!(await getUsername(user.id))) throw new UsernameRequiredError();

  await db.$transaction(async (tx) => {
    const habit = await tx.habit.findFirst({
      where: { id: habitId, userId: user.id, archivedAt: null },
      select: { id: true, isPublic: true },
    });
    if (!habit) throw new HabitNotFoundError();
    if (habit.isPublic) return;
    const published = await tx.habit.count({ where: { userId: user.id, isPublic: true, archivedAt: null } });
    if (published >= MAX_PUBLIC_HABITS) throw new PublicLimitError();
    await tx.habit.update({ where: { id: habit.id }, data: { isPublic: true } });
  });
}

/** What visitors may see: never the reasons for skipped days, nor the internal id used by the owner's pages. */
function withoutPrivateNotes(habit: HabitView): HabitView {
  return {
    ...habit,
    id: habit.publicId,
    entries: habit.entries.map((entry) => ({ ...entry, skipReason: null })),
  };
}

const publicHabitQuery = {
  where: { isPublic: true, archivedAt: null },
  orderBy: { createdAt: "asc" },
  include: { versions: true, entries: true },
} as const;

/** The public profile, or null when the user does not exist or shows no habit (so its existence is not revealed). */
export async function getPublicProfile(rawUsername: string) {
  const username = normalizeUsername(rawUsername);
  if (usernameProblem(username) === "format") return null;
  const user = await db.user.findUnique({
    where: { username },
    select: { username: true, timezone: true, habits: publicHabitQuery },
  });
  if (!user || user.habits.length === 0) return null;
  return {
    username,
    timezone: user.timezone,
    habits: user.habits.map((habit) => withoutPrivateNotes(toHabitView(habit))),
  };
}

/** The habit behind a README image, or null when it is private, archived, deleted or unknown. */
export async function getEmbedHabit(publicId: string) {
  const habit = await db.habit.findFirst({
    where: { publicId, isPublic: true, archivedAt: null },
    include: { versions: true, entries: true, user: { select: { timezone: true } } },
  });
  if (!habit) return null;
  return { habit: withoutPrivateNotes(toHabitView(habit)), timezone: habit.user.timezone };
}
