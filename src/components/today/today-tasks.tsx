"use client";

import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useRef, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarDate } from "@/domain/calendar-date";
import { MAX_PENDING_TASKS, MAX_TASK_TITLE, pendingSince, type TaskRecord } from "@/domain/tasks";
import { formatWeekdayDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createTaskAction, deleteTaskAction, setTaskDoneAction } from "@/server/tasks/actions";

type TaskUpdate =
  | { type: "add"; task: TaskRecord }
  | { type: "toggle"; id: string; completedOn: CalendarDate | null }
  | { type: "delete"; id: string };

function applyUpdate(tasks: TaskRecord[], update: TaskUpdate): TaskRecord[] {
  switch (update.type) {
    case "add":
      return [...tasks, update.task];
    case "toggle":
      return tasks.map((task) => (task.id === update.id ? { ...task, completedOn: update.completedOn } : task));
    case "delete":
      return tasks.filter((task) => task.id !== update.id);
  }
}

const TEMPORARY_ID = "temporary-";

/**
 * One-off tasks for today. Unfinished tasks from earlier days carry over (the
 * server already includes them); done tasks stay crossed out until the day ends.
 */
export function TodayTasks({ tasks, today }: { tasks: TaskRecord[]; today: CalendarDate }) {
  const t = useTranslations();
  const [visible, addOptimisticUpdate] = useOptimistic(tasks, applyUpdate);
  const [saving, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function run(update: TaskUpdate, action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      addOptimisticUpdate(update);
      const result = await action();
      if (result.ok) return;
      toast.error(
        result.error === "limitReached" ? t("today.taskLimit", { max: MAX_PENDING_TASKS }) : t("common.saveFailed"),
      );
    });
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = input.current;
    const title = field?.value.trim();
    if (!field || !title) return;
    field.value = "";
    const task: TaskRecord = {
      id: `${TEMPORARY_ID}${crypto.randomUUID()}`,
      title,
      createdFor: today,
      completedOn: null,
      createdAt: new Date().toISOString(),
    };
    run({ type: "add", task }, () => createTaskAction(title));
  }

  return (
    <section
      aria-labelledby="today-tasks"
      aria-busy={saving}
      className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 sm:p-6"
    >
      <h2 id="today-tasks" className="text-base font-semibold">
        {t("today.tasks")}
      </h2>

      <form onSubmit={add} className="flex gap-2">
        <label htmlFor="new-task" className="sr-only">
          {t("today.newTask")}
        </label>
        <Input
          ref={input}
          id="new-task"
          maxLength={MAX_TASK_TITLE}
          placeholder={t("today.newTaskPlaceholder")}
          autoComplete="off"
        />
        <Button type="submit" size="icon" aria-label={t("today.addTask")}>
          <PlusIcon />
        </Button>
      </form>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("today.tasksEmpty")}</p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((task) => {
            const done = task.completedOn !== null;
            const since = pendingSince(task, today);
            const unsaved = task.id.startsWith(TEMPORARY_ID);
            return (
              <li key={task.id} className="flex min-h-12 items-center gap-3 border-b py-2 last:border-b-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  disabled={unsaved}
                  onClick={() =>
                    run({ type: "toggle", id: task.id, completedOn: done ? null : today }, () =>
                      setTaskDoneAction(task.id, !done),
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none",
                      done ? "border-transparent bg-foreground text-background" : "border-foreground/40",
                    )}
                  >
                    {done && <CheckIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block break-words", done && "text-muted-foreground line-through")}>
                      {task.title}
                    </span>
                    {since && (
                      <span className="block text-xs text-muted-foreground">
                        {t("today.pendingSince", { date: formatWeekdayDayMonth(since) })}
                      </span>
                    )}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("today.deleteTask", { title: task.title })}
                  disabled={unsaved}
                  onClick={() => run({ type: "delete", id: task.id }, () => deleteTaskAction(task.id))}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
