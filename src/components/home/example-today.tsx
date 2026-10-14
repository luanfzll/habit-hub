"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { StreakTile } from "@/components/habit/streak-tile";
import { Check } from "@/components/today/today-habits";
import { historyOf } from "@/components/habit/use-habit-entries";
import { useHabitSummary } from "@/components/habit/use-habit-summary";
import type { CalendarDate } from "@/domain/calendar-date";
import { computeStats } from "@/domain/day-state";
import type { DayState } from "@/domain/day-state";
import { buildGrid, gridStart, type GridLayout } from "@/domain/grid";
import { exampleHabits } from "@/lib/example-habits";
import { paletteVariables } from "@/lib/palette";
import type { HabitView } from "@/server/habits/service";
import { useBrowserToday } from "./use-browser-today";

const WEEKS = 12;

/** The hero's example: a "Today" card with three made-up habits and their last 12 weeks. */
export function ExampleToday() {
  const t = useTranslations("home");
  const today = useBrowserToday();
  const habits = useMemo(
    () =>
      today && exampleHabits(today, (key) => ({ name: t(`examples.${key}.name`), unit: t(`examples.${key}.unit`) })),
    [today, t],
  );
  const layouts = useMemo(
    () => (habits && today ? habits.map((habit) => buildGrid(historyOf(habit), { today, weeks: WEEKS })) : []),
    [habits, today],
  );

  if (!habits || !today) return <div aria-hidden className="h-[25rem] rounded-[1.75rem] bg-card" />;

  // Today's square is the last one drawn in each grid.
  const todays = layouts.map((layout) => layout.columns.at(-1)?.findLast(Boolean));
  const scheduled = todays.filter((day) => day && day.kind !== "off-schedule").length;
  const done = todays.filter((day) => day?.kind === "done").length;

  return (
    <div className="flex flex-col rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex items-center justify-between gap-4 pb-2">
        <p className="flex items-center gap-2 font-semibold">
          {t("todayTitle")}
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{t("exampleBadge")}</span>
        </p>
        <p className="text-sm text-muted-foreground">{t("todayCount", { done, total: scheduled })}</p>
      </div>
      <ul className="flex flex-col divide-y">
        {habits.map((habit, i) => (
          <ExampleRow key={habit.id} habit={habit} today={today} layout={layouts[i]} todayState={todays[i]} />
        ))}
      </ul>
    </div>
  );
}

function ExampleRow({
  habit,
  today,
  layout,
  todayState,
}: {
  habit: HabitView;
  today: CalendarDate;
  layout: GridLayout;
  todayState: DayState | null | undefined;
}) {
  const t = useTranslations("home");
  const summary = useHabitSummary(habit, today);
  const { currentStreak } = computeStats(historyOf(habit), today, gridStart({ today }));

  return (
    <li className="habit-scope flex items-center gap-4 py-4 last:pb-0" style={paletteVariables(habit.color)}>
      <StreakTile count={currentStreak} size="sm" />
      <div className="min-w-0 flex-1">
        {/* The same check as the app's "Today" panel tells at a glance which habit is still open. */}
        <p className="flex items-center gap-2 font-semibold">
          {todayState?.kind === "off-schedule" ? (
            <>
              {/* Not scheduled today: an empty, dashed box keeps the names aligned. */}
              <span
                aria-hidden
                className="size-[1.125rem] shrink-0 rounded-[5px] border-2 border-dashed border-muted-foreground/40"
              />
              <span className="truncate">{habit.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{t("todayOff")}</span>
            </>
          ) : (
            <>
              <Check checked={todayState?.kind === "done"} size="sm" />
              <span className="truncate">{habit.name}</span>
              <span className="sr-only">{todayState?.kind === "done" ? t("todayDone") : t("todayPending")}</span>
            </>
          )}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
      </div>
      <div
        role="img"
        aria-label={t("exampleGridLabel", { name: habit.name, weeks: WEEKS })}
        className="grid shrink-0 grid-flow-col gap-[3px] [--cell-size:8px] sm:[--cell-size:10px]"
        style={{ gridTemplateRows: "repeat(7, var(--cell-size))", gridAutoColumns: "var(--cell-size)" }}
      >
        {layout.columns.flatMap((days, column) =>
          days.map((day, row) =>
            day ? (
              <span
                key={`${column}-${row}`}
                className="habit-cell"
                data-kind={day.kind}
                data-level={day.level}
                data-today={day.isToday}
              />
            ) : (
              <span key={`${column}-${row}`} />
            ),
          ),
        )}
      </div>
    </li>
  );
}
