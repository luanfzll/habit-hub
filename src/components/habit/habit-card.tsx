"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { CalendarDate } from "@/domain/calendar-date";
import { paletteVariables } from "@/lib/palette";
import type { HabitView } from "@/server/habits/service";
import { DayMenu } from "./day-menu";
import { GridLegend, HabitGrid } from "./habit-grid";
import { StreakTile } from "./streak-tile";
import { TodayControl } from "./today-control";
import { useHabitTracker } from "./use-habit-entries";
import { useHabitSummary } from "./use-habit-summary";

export function HabitCard({ habit, today }: { habit: HabitView; today: CalendarDate }) {
  const tracker = useHabitTracker(habit, today);
  const summary = useHabitSummary(habit, today);

  return (
    <article
      className="habit-scope flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6"
      style={paletteVariables(habit.color)}
      aria-labelledby={`habit-${habit.id}`}
      aria-busy={tracker.saving}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-4">
        {/* Scoreboard and title open the habit page; the chevron shows it on touch screens too. */}
        <Link
          href={`/habitos/${habit.id}`}
          aria-labelledby={`habit-${habit.id}`}
          className="group flex min-w-0 flex-1 items-center gap-4 rounded-[1.25rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <StreakTile count={tracker.stats.currentStreak} animate={tracker.animateStreak} />
          <div className="min-w-0 flex-1">
            <h2 id={`habit-${habit.id}`} className="flex items-center gap-1 text-lg font-semibold">
              <span className="truncate underline-offset-4 group-hover:underline">{habit.name}</span>
              <ChevronRightIcon
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </h2>
            <p className="truncate text-sm text-muted-foreground">{summary}</p>
          </div>
        </Link>
        {/* Wraps under the title on narrow screens. */}
        <div className="w-full sm:w-auto">
          <TodayControl
            today={tracker.todayState}
            startDate={habit.startDate}
            unit={habit.unit}
            onChange={(value) => tracker.register(today, { value })}
          />
        </div>
      </header>

      <HabitGrid
        layout={tracker.layout}
        name={habit.name}
        unit={habit.unit}
        initialFocus={today}
        popDate={tracker.popDate}
        onPopEnd={tracker.clearPop}
        onSelectDay={(day, anchor) => tracker.setSelection({ day, anchor })}
      />
      <GridLegend {...tracker.legend} />

      <DayMenu
        selection={tracker.selection}
        unit={habit.unit}
        onChange={(day, change) => tracker.register(day.date, change)}
        onClose={() => tracker.setSelection(null)}
      />
    </article>
  );
}
