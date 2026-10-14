"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { HabitNotFoundError } from "../habits/service";
import { getCurrentUser } from "../session";
import {
  EmailNotVerifiedError,
  PublicLimitError,
  setHabitPublic,
  setUsername,
  UsernameInvalidError,
  UsernameRequiredError,
  UsernameTakenError,
} from "./service";

export type UsernameResult =
  { ok: true; username: string } | { ok: false; error: "format" | "reserved" | "taken" | "unknown" };

export async function setUsernameAction(raw: string): Promise<UsernameResult> {
  const user = await getCurrentUser();
  if (!user || typeof raw !== "string") return { ok: false, error: "unknown" };
  try {
    const username = await setUsername(user.id, raw);
    refresh();
    return { ok: true, username };
  } catch (error) {
    if (error instanceof UsernameInvalidError) return { ok: false, error: error.problem };
    if (error instanceof UsernameTakenError) return { ok: false, error: "taken" };
    throw error;
  }
}

export type PublishResult =
  { ok: true } | { ok: false; error: "usernameRequired" | "limitReached" | "emailNotVerified" | "unknown" };

export async function setHabitPublicAction(habitId: string, isPublic: boolean): Promise<PublishResult> {
  const user = await getCurrentUser();
  const id = z.uuid().safeParse(habitId);
  if (!user || !id.success) return { ok: false, error: "unknown" };
  try {
    await setHabitPublic(user, id.data, isPublic === true);
  } catch (error) {
    if (error instanceof UsernameRequiredError) return { ok: false, error: "usernameRequired" };
    if (error instanceof PublicLimitError) return { ok: false, error: "limitReached" };
    if (error instanceof EmailNotVerifiedError) return { ok: false, error: "emailNotVerified" };
    if (error instanceof HabitNotFoundError) return { ok: false, error: "unknown" };
    throw error;
  }
  refresh();
  return { ok: true };
}
