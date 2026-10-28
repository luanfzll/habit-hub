"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { MAX_TASK_TITLE } from "@/domain/tasks";
import { getCurrentUser, userToday } from "../session";
import { createTask, deleteTask, renameTask, setTaskDone, TaskLimitError, TaskNotFoundError } from "./service";

const taskIdSchema = z.uuid();
const titleSchema = z.string().trim().min(1).max(MAX_TASK_TITLE);

type TaskActionResult = { ok: true } | { ok: false; error?: "limitReached" | "invalid" };

export async function createTaskAction(title: string): Promise<TaskActionResult> {
  const user = await getCurrentUser();
  const parsed = titleSchema.safeParse(title);
  if (!user) return { ok: false };
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    await createTask(user.id, parsed.data, userToday(user));
  } catch (error) {
    if (error instanceof TaskLimitError) return { ok: false, error: "limitReached" };
    throw error;
  }
  refresh();
  return { ok: true };
}

async function changeTask(taskId: string, change: (userId: string, id: string) => Promise<void>) {
  const user = await getCurrentUser();
  const id = taskIdSchema.safeParse(taskId);
  if (!user || !id.success) return { ok: false as const };
  try {
    await change(user.id, id.data);
  } catch (error) {
    if (error instanceof TaskNotFoundError) return { ok: false as const };
    throw error;
  }
  refresh();
  return { ok: true as const };
}

export async function setTaskDoneAction(taskId: string, done: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  return changeTask(taskId, (userId, id) => setTaskDone(userId, id, done === true, userToday(user)));
}

export async function renameTaskAction(taskId: string, title: string) {
  const parsed = titleSchema.safeParse(title);
  if (!parsed.success) return { ok: false as const };
  return changeTask(taskId, (userId, id) => renameTask(userId, id, parsed.data));
}

export async function deleteTaskAction(taskId: string) {
  return changeTask(taskId, deleteTask);
}
