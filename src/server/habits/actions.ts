"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireUser, userToday } from "../session";
import type { HabitFormState } from "./form-state";
import { calendarDateSchema, entryChangeSchema, habitInputSchema } from "./input";
import {
  createHabit,
  DayNotEditableError,
  HabitLimitError,
  HabitNotFoundError,
  setEntry,
  updateHabit,
} from "./service";

const habitIdSchema = z.uuid();

function readHabitForm(formData: FormData) {
  return habitInputSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    unit: formData.get("unit") ?? "",
    target: formData.get("target"),
    weekdays: formData.get("weekdays"),
  });
}

export async function createHabitAction(_: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const user = await requireUser();
  const input = readHabitForm(formData);
  if (!input.success) return { error: "invalid" };

  try {
    await createHabit(user.id, input.data, userToday(user));
  } catch (error) {
    if (error instanceof HabitLimitError) return { error: "limitReached" };
    throw error;
  }
  redirect("/painel");
}

export async function updateHabitAction(
  habitId: string,
  _: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const user = await requireUser();
  const id = habitIdSchema.safeParse(habitId);
  const input = readHabitForm(formData);
  if (!id.success) notFound();
  if (!input.success) return { error: "invalid" };

  try {
    await updateHabit(user.id, id.data, input.data, userToday(user));
  } catch (error) {
    if (error instanceof HabitNotFoundError) notFound();
    throw error;
  }
  redirect("/painel");
}

/** Called from the grid and the "today" control. Returns instead of throwing so the UI can roll back. */
export async function setEntryAction(habitId: string, date: string, change: unknown): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  const id = habitIdSchema.safeParse(habitId);
  const day = calendarDateSchema.safeParse(date);
  const parsedChange = entryChangeSchema.safeParse(change);
  if (!user || !id.success || !day.success || !parsedChange.success) return { ok: false };

  try {
    await setEntry(user.id, id.data, day.data, parsedChange.data, userToday(user));
  } catch (error) {
    if (error instanceof HabitNotFoundError || error instanceof DayNotEditableError) return { ok: false };
    throw error;
  }
  refresh();
  return { ok: true };
}
