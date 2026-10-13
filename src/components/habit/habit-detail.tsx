"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { maxDate, type CalendarDate } from "@/domain/calendar-date";
import { computeStats, type DayState } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import { configOn, EVERY_DAY, weekdaysToList } from "@/domain/habit-config";
import { LOCALE } from "@/i18n/request";
import { formatShortDate } from "@/lib/format";
import { paletteVariables } from "@/lib/palette";
import { archiveHabitAction, unarchiveHabitAction } from "@/server/habits/actions";
import type { HabitView } from "@/server/habits/service";
import { DayMenu } from "./day-menu";
import { DeleteHabitDialog } from "./delete-habit-dialog";
import { GridLegend, HabitGrid } from "./habit-grid";
import { TodayControl } from "./today-control";
import { useHabitEntries } from "./use-habit-entries";

const percent = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 });
const list = new Intl.ListFormat(LOCALE, { type: "conjunction" });

/** The habit's own page: stats, the full year and the habit's actions. */
export function HabitDetail({ habit, today }: { habit: HabitView; today: CalendarDate }) {
  const t = useTranslations("habitPage");
  const tGrid = useTranslations("grid");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { history, save, saving } = useHabitEntries(habit);
  const [selection, setSelection] = useState<{ day: DayState; anchor: HTMLButtonElement } | null>(null);
  const [archiving, startArchive] = useTransition();

  const layout = useMemo(() => buildGrid(history, { today }), [history, today]);
  const stats = useMemo(() => computeStats(history, today, layout.start), [history, today, layout.start]);
  const todayState = layout.columns.at(-1)?.find((day) => day?.isToday && day.kind !== "before-start") ?? undefined;
  const config = configOn(habit.versions, maxDate(today, habit.startDate)) ?? habit.versions[0];
  const skippedDays = useMemo(
    () =>
      [...history.entries]
        .filter(([, entry]) => entry.skipped)
        .map(([date, entry]) => ({ date, reason: entry.skipReason ?? null }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [history.entries],
  );

  const schedule =
    config.weekdays === EVERY_DAY
      ? t("everyDay")
      : list.format(weekdaysToList(config.weekdays).map((day) => tGrid("weekdayShort", { day: String(day) })));
  const target =
    config.target === 1
      ? t("targetDone")
      : habit.unit
        ? t("targetAmountUnit", { target: config.target, unit: habit.unit })
        : t("targetAmount", { target: config.target });

  function archive() {
    startArchive(async () => {
      const result = await archiveHabitAction(habit.id);
      if (!result.ok) {
        toast.error(tCommon("saveFailed"));
        return;
      }
      toast(t("archived", { name: habit.name }), {
        action: { label: t("undo"), onClick: () => void unarchiveHabitAction(habit.id) },
      });
      router.push("/painel");
    });
  }

  return (
    <article
      className="flex flex-col gap-6"
      style={paletteVariables(habit.color)}
      aria-labelledby="habit-title"
      aria-busy={saving}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="habit-title" className="text-2xl font-semibold tracking-tight break-words">
            {habit.name}
          </h1>
          <p className="text-muted-foreground">
            {target} · {schedule}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link href={`/habitos/${habit.id}/editar`} className={buttonVariants({ variant: "outline" })}>
            {t("edit")}
          </Link>
          <Button variant="ghost" disabled={archiving} onClick={archive}>
            {t("archive")}
          </Button>
          <DeleteHabitDialog habitId={habit.id} name={habit.name} onDeleted={() => router.push("/painel")} />
        </div>
      </header>

      <section aria-label={t("statsLabel")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t("currentStreak")} value={t("days", { count: stats.currentStreak })} />
        <Stat label={t("longestStreak")} value={t("days", { count: stats.longestStreak })} />
        <Stat
          label={t("completion")}
          value={stats.completionRate === null ? t("noData") : percent.format(stats.completionRate)}
          detail={
            stats.completionRate === null
              ? undefined
              : t("completionDetail", { done: stats.doneDays, total: stats.measuredDays })
          }
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs sm:p-5">
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
          overflow="scroll"
          onSelectDay={(day, anchor) => setSelection({ day, anchor })}
        />
        <GridLegend />
      </section>

      {skippedDays.length > 0 && (
        <section aria-labelledby="skipped-days" className="flex flex-col gap-3">
          <div>
            <h2 id="skipped-days" className="text-lg font-semibold">
              {t("skippedDays")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("skippedDaysHint")}</p>
          </div>
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {skippedDays.map(({ date, reason }) => (
              <li key={date} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-6">
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums sm:w-44">
                  {formatShortDate(date)}
                </span>
                <span className={reason ? "break-words" : "text-muted-foreground"}>{reason ?? t("noReason")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DayMenu
        selection={selection}
        unit={habit.unit}
        onChange={(day, change) => save(day.date, change)}
        onClose={() => setSelection(null)}
      />
    </article>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}
