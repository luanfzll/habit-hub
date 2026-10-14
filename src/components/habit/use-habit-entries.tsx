"use client";

import { useTranslations } from "next-intl";
import { createContext, use, useMemo, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import type { CalendarDate } from "@/domain/calendar-date";
import { computeStats, type DayEntry, type DayState, type HabitHistory } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import { EVERY_DAY } from "@/domain/habit-config";
import { setEntryAction } from "@/server/habits/actions";
import type { EntryChange } from "@/server/habits/input";
import type { HabitView } from "@/server/habits/service";

type EntriesByHabit = Record<string, HabitView["entries"]>;

interface EntryUpdate {
  habitId: string;
  date: CalendarDate;
  entry: DayEntry | null;
}

function applyUpdate(state: EntriesByHabit, { habitId, date, entry }: EntryUpdate): EntriesByHabit {
  const others = (state[habitId] ?? []).filter((existing) => existing.date !== date);
  return { ...state, [habitId]: entry ? [...others, { date, ...entry }] : others };
}

interface HabitEntriesValue {
  entries: EntriesByHabit;
  save: (habitId: string, date: CalendarDate, change: EntryChange) => void;
  isSaving: (habitId: string) => boolean;
}

const HabitEntriesContext = createContext<HabitEntriesValue | null>(null);

/**
 * Optimistic registrations shared by everything that shows the same habits (the
 * "Today" list and the habit cards), so a change made in one place shows at once
 * everywhere. A change rolls back, with a message, if the server refuses it.
 * Server Actions run one at a time, so quick successive changes are saved in order.
 */
export function HabitEntriesProvider({ habits, children }: { habits: HabitView[]; children: ReactNode }) {
  const t = useTranslations("common");
  const base = useMemo(
    () => Object.fromEntries(habits.map((habit) => [habit.id, habit.entries])) as EntriesByHabit,
    [habits],
  );
  const [entries, addOptimisticUpdate] = useOptimistic(base, applyUpdate);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [, startTransition] = useTransition();

  const adjustPending = (habitId: string, delta: number) =>
    setPending((current) => ({ ...current, [habitId]: (current[habitId] ?? 0) + delta }));

  function save(habitId: string, date: CalendarDate, change: EntryChange) {
    const entry: DayEntry | null =
      "skip" in change
        ? { value: 0, skipped: true, skipReason: change.reason ?? null }
        : change.value === 0
          ? null
          : { value: change.value, skipped: false };

    adjustPending(habitId, 1);
    startTransition(async () => {
      addOptimisticUpdate({ habitId, date, entry });
      const result = await setEntryAction(habitId, date, change);
      if (!result.ok) toast.error(t("saveFailed"));
      adjustPending(habitId, -1);
    });
  }

  const value: HabitEntriesValue = { entries, save, isSaving: (habitId) => (pending[habitId] ?? 0) > 0 };
  return <HabitEntriesContext value={value}>{children}</HabitEntriesContext>;
}

/** History of one habit, including registrations that are still being saved. */
export function useHabitEntries(habit: HabitView) {
  const context = use(HabitEntriesContext);
  if (!context) throw new Error("useHabitEntries must be used inside a HabitEntriesProvider");
  const entries = context.entries[habit.id] ?? habit.entries;

  const history: HabitHistory = useMemo(
    () => ({
      startDate: habit.startDate,
      versions: habit.versions,
      entries: new Map(entries.map(({ date, value, skipped, skipReason }) => [date, { value, skipped, skipReason }])),
    }),
    [habit.startDate, habit.versions, entries],
  );

  return {
    history,
    save: (date: CalendarDate, change: EntryChange) => context.save(habit.id, date, change),
    saving: context.isSaving(habit.id),
  };
}

/** Everything a habit card or page needs: grid, stats, today's state, the day menu and the feedback motion. */
export function useHabitTracker(habit: HabitView, today: CalendarDate) {
  const { history, save, saving } = useHabitEntries(habit);
  const [selection, setSelection] = useState<{ day: DayState; anchor: HTMLButtonElement } | null>(null);
  // Feedback motion only plays in answer to the person's own action.
  const [popDate, setPopDate] = useState<CalendarDate | null>(null);
  const [registered, setRegistered] = useState(false);

  const layout = useMemo(() => buildGrid(history, { today }), [history, today]);
  const stats = useMemo(() => computeStats(history, today, layout.start), [history, today, layout.start]);
  const todayState = layout.columns.at(-1)?.find((day) => day?.isToday && day.kind !== "before-start") ?? undefined;

  function register(date: CalendarDate, change: EntryChange) {
    save(date, change);
    setRegistered(true);
    setPopDate("value" in change && change.value > 0 ? date : null);
  }

  return {
    history,
    layout,
    stats,
    todayState,
    saving,
    register,
    selection,
    setSelection,
    popDate,
    clearPop: () => setPopDate(null),
    animateStreak: registered,
    legend: {
      showOffSchedule: habit.versions.some((version) => version.weekdays !== EVERY_DAY),
      showSkipped: [...history.entries.values()].some((entry) => entry.skipped),
    },
  };
}
