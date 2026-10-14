"use client";

import { useMemo } from "react";
import type { CalendarDate } from "@/domain/calendar-date";
import { computeStats } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import { paletteVariables } from "@/lib/palette";
import type { HabitView } from "@/server/habits/service";
import { GridLegend, HabitGrid } from "./habit-grid";
import { StreakTile } from "./streak-tile";
import { historyOf, legendFor } from "./use-habit-entries";
import { useHabitSummary } from "./use-habit-summary";

/**
 * The owner's habit card as visitors see it: same scoreboard and grid, nothing to click.
 * `badge` marks it, e.g. as the home page's example.
 */
export function PublicHabitCard({ habit, today, badge }: { habit: HabitView; today: CalendarDate; badge?: string }) {
  const summary = useHabitSummary(habit, today);
  const history = useMemo(() => historyOf(habit), [habit]);
  const layout = useMemo(() => buildGrid(history, { today }), [history, today]);
  const { currentStreak } = computeStats(history, today, layout.start);

  return (
    <article
      className="habit-scope flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6"
      style={paletteVariables(habit.color)}
      aria-labelledby={`habit-${habit.id}`}
    >
      <header className="flex items-center gap-4">
        <StreakTile count={currentStreak} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 id={`habit-${habit.id}`} className="truncate text-lg font-semibold">
              {habit.name}
            </h2>
            {badge && (
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{summary}</p>
        </div>
      </header>
      <HabitGrid layout={layout} name={habit.name} unit={habit.unit} initialFocus={today} />
      <GridLegend {...legendFor(habit, history)} />
    </article>
  );
}
