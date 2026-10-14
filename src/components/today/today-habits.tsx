"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import { useHabitEntries } from "@/components/habit/use-habit-entries";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/calendar-date";
import { evaluateDays } from "@/domain/day-state";
import { MAX_VALUE } from "@/domain/habit-config";
import { paletteVariables } from "@/lib/palette";
import { cn } from "@/lib/utils";
import type { HabitView } from "@/server/habits/service";

/** Today's scheduled habits, in creation order, to be ticked off without scrolling to their cards. */
export function TodayHabits({ habits, today }: { habits: HabitView[]; today: CalendarDate }) {
  const t = useTranslations("today");
  const scheduled = habits.filter((habit) => isScheduledToday(habit, today));

  return (
    <section aria-labelledby="today-habits" className="flex flex-col gap-3 rounded-[1.75rem] bg-card p-5 sm:p-6">
      <h2 id="today-habits" className="text-base font-semibold">
        {t("habits")}
      </h2>
      {scheduled.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("habitsEmpty")}</p>
      ) : (
        <ul className="flex flex-col">
          {scheduled.map((habit) => (
            <TodayHabitRow key={habit.id} habit={habit} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The schedule does not depend on what was registered, so the configuration alone decides. */
function isScheduledToday(habit: HabitView, today: CalendarDate) {
  const [day] = evaluateDays(
    { startDate: habit.startDate, versions: habit.versions, entries: new Map() },
    today,
    today,
    today,
  );
  return day.scheduled && day.kind !== "before-start";
}

function TodayHabitRow({ habit, today }: { habit: HabitView; today: CalendarDate }) {
  const t = useTranslations();
  const { history, save } = useHabitEntries(habit);
  const day = useMemo(() => evaluateDays(history, today, today, today)[0], [history, today]);

  const done = day.kind === "done";
  const skipped = day.kind === "skipped";
  const numeric = day.target > 1;
  const amount = habit.unit
    ? t("grid.amountUnit", { value: day.value, target: day.target, unit: habit.unit })
    : t("grid.amount", { value: day.value, target: day.target });

  /**
   * The check completes the day in one click (the whole target for numeric habits).
   * Unchecking clears the day; when that throws away a registered amount, the toast
   * offers to put it back.
   */
  function toggle() {
    if (!done) {
      save(today, { value: day.target });
      return;
    }
    const previous = day.value;
    save(today, { value: 0 });
    if (numeric) {
      toast(t("today.cleared", { name: habit.name }), {
        action: { label: t("habitPage.undo"), onClick: () => save(today, { value: previous }) },
      });
    }
  }

  const step = (delta: number) => save(today, { value: Math.min(MAX_VALUE, Math.max(0, day.value + delta)) });

  return (
    <li
      className="habit-scope flex min-h-12 items-center gap-2 border-b py-2 last:border-b-0"
      style={paletteVariables(habit.color)}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        onClick={toggle}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Check checked={done} />
        <span className="min-w-0">
          <Name done={done}>{habit.name}</Name>
          {numeric && <span className="block text-xs text-muted-foreground tabular-nums">{amount}</span>}
        </span>
      </button>
      {skipped && <span className="text-xs text-muted-foreground">{t("today.skipped")}</span>}
      {numeric && (
        <>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("today.removeOne", { name: habit.name })}
            disabled={day.value === 0}
            onClick={() => step(-1)}
          >
            <MinusIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("today.addOne", { name: habit.name })}
            disabled={day.value >= MAX_VALUE}
            onClick={() => step(1)}
          >
            <PlusIcon />
          </Button>
        </>
      )}
    </li>
  );
}

/** Square, like a grid cell; tasks use round checks so the two lists read differently. */
function Check({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors motion-reduce:transition-none",
        checked ? "border-transparent bg-[var(--habit)] text-[var(--habit-text)]" : "border-[var(--habit)]",
      )}
    >
      {checked && <CheckIcon className="size-4" strokeWidth={3} />}
    </span>
  );
}

function Name({ done, children }: { done: boolean; children: string }) {
  return (
    <span className={cn("block truncate font-medium", done && "text-muted-foreground line-through")}>{children}</span>
  );
}
