import { describe, expect, it } from "vitest";
import { addDays, parseCalendarDate } from "@/domain/calendar-date";
import { MAX_PENDING_TASKS } from "@/domain/tasks";
import { db } from "@/server/db";
import { toDbDate } from "@/server/db-dates";
import { createUser } from "../../../tests/support/factories";
import {
  createTask,
  deleteTask,
  listTodayTasks,
  renameTask,
  setTaskDone,
  TaskLimitError,
  TaskNotFoundError,
} from "./service";

const today = parseCalendarDate("2026-10-14");

describe("tasks", () => {
  it("carries pending tasks over to the next days until they are done", async () => {
    const user = await createUser();
    const { id } = await createTask(user.id, "Pagar a conta de luz", addDays(today, -2));

    const [carried] = await listTodayTasks(user.id, today);
    expect(carried).toMatchObject({ id, createdFor: "2026-10-12", completedOn: null });

    await setTaskDone(user.id, id, true, today);
    expect((await listTodayTasks(user.id, today))[0]).toMatchObject({ completedOn: "2026-10-14" });
    // Done tasks disappear once the day turns.
    expect(await listTodayTasks(user.id, addDays(today, 1))).toEqual([]);
  });

  it("can be renamed by their owner", async () => {
    const user = await createUser();
    const { id } = await createTask(user.id, "Pagar a cota de luz", today);
    await renameTask(user.id, id, "Pagar a conta de luz");
    expect((await listTodayTasks(user.id, today))[0]).toMatchObject({ id, title: "Pagar a conta de luz" });
  });

  it("can be marked as not done again", async () => {
    const user = await createUser();
    const { id } = await createTask(user.id, "Ligar para o banco", today);
    await setTaskDone(user.id, id, true, today);
    await setTaskDone(user.id, id, false, today);
    expect((await listTodayTasks(user.id, addDays(today, 3)))[0]).toMatchObject({ id, completedOn: null });
  });

  it("belongs only to its owner", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const { id } = await createTask(owner.id, "Particular", today);

    expect(await listTodayTasks(stranger.id, today)).toEqual([]);
    await expect(setTaskDone(stranger.id, id, true, today)).rejects.toThrow(TaskNotFoundError);
    await expect(deleteTask(stranger.id, id)).rejects.toThrow(TaskNotFoundError);
    await expect(renameTask(stranger.id, id, "Invadida")).rejects.toThrow(TaskNotFoundError);

    await deleteTask(owner.id, id);
    expect(await listTodayTasks(owner.id, today)).toEqual([]);
  });

  it(`allows at most ${MAX_PENDING_TASKS} pending tasks`, async () => {
    const user = await createUser();
    await db.task.createMany({
      data: Array.from({ length: MAX_PENDING_TASKS }, (_, i) => ({
        userId: user.id,
        title: `Tarefa ${i}`,
        createdFor: toDbDate(today),
      })),
    });
    await expect(createTask(user.id, "Uma a mais", today)).rejects.toThrow(TaskLimitError);
  });
});
