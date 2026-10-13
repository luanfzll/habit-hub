"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarDate } from "@/domain/calendar-date";
import { computeStats, type DayState } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import { paletteVariables } from "@/lib/palette";
import type { HabitView } from "@/server/habits/service";
import { DayMenu } from "./day-menu";
import { GridLegend, HabitGrid } from "./habit-grid";
import { TodayControl } from "./today-control";
import { useHabitEntries } from "./use-habit-entries";

export function HabitCard({ habit, today }: { habit: HabitView; today: CalendarDate }) {
  const t = useTranslations("habit");
  const { history, save, saving } = useHabitEntries(habit);
  const [selection, setSelection] = useState<{ day: DayState; anchor: HTMLButtonElement } | null>(null);

  const layout = useMemo(() => buildGrid(history, { today }), [history, today]);
  const stats = useMemo(() => computeStats(history, today, layout.start), [history, today, layout.start]);
  const todayState = layout.columns.at(-1)?.find((day) => day?.isToday && day.kind !== "before-start") ?? undefined;

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs sm:p-5"
      style={paletteVariables(habit.color)}
      aria-labelledby={`habit-${habit.id}`}
      aria-busy={saving}
    >
      <header className="min-w-0">
        <h2 id={`habit-${habit.id}`} className="truncate text-base font-semibold">
          <Link href={`/habitos/${habit.id}`} className="underline-offset-4 hover:underline">
            {habit.name}
          </Link>
        </h2>
        <p className="text-sm text-muted-foreground">{t("streak", { count: stats.currentStreak })}</p>
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
