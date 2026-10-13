"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/calendar-date";
import { computeStats, type DayEntry, type DayState, type HabitHistory } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import { paletteVariables } from "@/lib/palette";
import { setEntryAction } from "@/server/habits/actions";
import type { EntryChange } from "@/server/habits/input";
import type { HabitView } from "@/server/habits/service";
import { DayMenu } from "./day-menu";
import { GridLegend, HabitGrid } from "./habit-grid";
import { TodayControl } from "./today-control";

interface EntryUpdate {
  date: CalendarDate;
  entry: DayEntry | null;
}

function applyUpdate(entries: HabitView["entries"], { date, entry }: EntryUpdate): HabitView["entries"] {
  const others = entries.filter((existing) => existing.date !== date);
  return entry ? [...others, { date, ...entry }] : others;
}

export function HabitCard({ habit, today }: { habit: HabitView; today: CalendarDate }) {
  const t = useTranslations();
  const [entries, addOptimisticUpdate] = useOptimistic(habit.entries, applyUpdate);
  const [saving, startTransition] = useTransition();
  const [selection, setSelection] = useState<{ day: DayState; anchor: HTMLButtonElement } | null>(null);

  const history: HabitHistory = useMemo(
    () => ({
      startDate: habit.startDate,
      versions: habit.versions,
      entries: new Map(entries.map(({ date, value, skipped }) => [date, { value, skipped }])),
    }),
    [habit.startDate, habit.versions, entries],
  );
  const layout = useMemo(() => buildGrid(history, { today }), [history, today]);
  const stats = useMemo(() => computeStats(history, today, layout.start), [history, today, layout.start]);
  const todayState = layout.columns.at(-1)?.find((day) => day?.isToday && day.kind !== "before-start") ?? undefined;

  function save(date: CalendarDate, change: EntryChange) {
    const entry: DayEntry | null =
      "skip" in change
        ? { value: 0, skipped: true }
        : change.value === 0
          ? null
          : { value: change.value, skipped: false };

    startTransition(async () => {
      addOptimisticUpdate({ date, entry });
      const result = await setEntryAction(habit.id, date, change);
      if (!result.ok) toast.error(t("common.saveFailed"));
    });
  }

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs sm:p-5"
      style={paletteVariables(habit.color)}
      aria-labelledby={`habit-${habit.id}`}
      aria-busy={saving}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`habit-${habit.id}`} className="truncate text-base font-semibold">
            {habit.name}
          </h2>
          <p className="text-sm text-muted-foreground">{t("habit.streak", { count: stats.currentStreak })}</p>
        </div>
        <Link
          href={`/habitos/${habit.id}/editar`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={t("dashboard.edit", { name: habit.name })}
        >
          <PencilIcon />
        </Link>
      </header>

      <TodayControl
        today={todayState}
        startDate={habit.startDate}
        unit={habit.unit}
        onChange={(value) => save(today, { value })}
      />

      <HabitGrid
        layout={layout}
        name={habit.name}
        unit={habit.unit}
        initialFocus={today}
        onSelectDay={(day, anchor) => setSelection({ day, anchor })}
      />
      <GridLegend />

      <DayMenu
        selection={selection}
        unit={habit.unit}
        onChange={(day, change) => save(day.date, change)}
        onClose={() => setSelection(null)}
      />
    </article>
  );
}
