"use client";

import { useTranslations } from "next-intl";
import { useMemo, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { CalendarDate } from "@/domain/calendar-date";
import type { DayEntry, HabitHistory } from "@/domain/day-state";
import { setEntryAction } from "@/server/habits/actions";
import type { EntryChange } from "@/server/habits/input";
import type { HabitView } from "@/server/habits/service";

interface EntryUpdate {
  date: CalendarDate;
  entry: DayEntry | null;
}

function applyUpdate(entries: HabitView["entries"], { date, entry }: EntryUpdate): HabitView["entries"] {
  const others = entries.filter((existing) => existing.date !== date);
  return entry ? [...others, { date, ...entry }] : others;
}

/**
 * Habit history with optimistic updates: a change shows at once and rolls back,
 * with a message, if the server refuses it. Server Actions run one at a time, so
 * quick successive changes are saved in order.
 */
export function useHabitEntries(habit: HabitView) {
  const t = useTranslations("common");
  const [entries, addOptimisticUpdate] = useOptimistic(habit.entries, applyUpdate);
  const [saving, startTransition] = useTransition();

  const history: HabitHistory = useMemo(
    () => ({
      startDate: habit.startDate,
      versions: habit.versions,
      entries: new Map(entries.map(({ date, value, skipped, skipReason }) => [date, { value, skipped, skipReason }])),
    }),
    [habit.startDate, habit.versions, entries],
  );

  function save(date: CalendarDate, change: EntryChange) {
    const entry: DayEntry | null =
      "skip" in change
        ? { value: 0, skipped: true, skipReason: change.reason ?? null }
        : change.value === 0
          ? null
          : { value: change.value, skipped: false };

    startTransition(async () => {
      addOptimisticUpdate({ date, entry });
      const result = await setEntryAction(habit.id, date, change);
      if (!result.ok) toast.error(t("saveFailed"));
    });
  }

  return { history, save, saving };
}
