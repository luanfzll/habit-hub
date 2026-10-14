"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/calendar-date";
import { LOCALE } from "@/i18n/request";
import { formatShortDate } from "@/lib/format";
import { paletteVariables } from "@/lib/palette";
import { archiveHabitAction, unarchiveHabitAction } from "@/server/habits/actions";
import type { HabitView } from "@/server/habits/service";
import { DayMenu } from "./day-menu";
import { DeleteHabitDialog } from "./delete-habit-dialog";
import { GridLegend, HabitGrid } from "./habit-grid";
import { StreakTile } from "./streak-tile";
import { TodayControl } from "./today-control";
import { ShareHabit } from "./share-habit";
import { HabitEntriesProvider, useHabitTracker } from "./use-habit-entries";
import { useHabitSummary } from "./use-habit-summary";

const percent = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 });

interface HabitDetailProps {
  habit: HabitView;
  today: CalendarDate;
  username: string | null;
  origin: string;
}

/** The habit's own page: the scoreboard, the whole year, sharing and the habit's actions. */
export function HabitDetail(props: HabitDetailProps) {
  return (
    <HabitEntriesProvider habits={[props.habit]}>
      <HabitDetailContent {...props} />
    </HabitEntriesProvider>
  );
}

function HabitDetailContent({ habit, today, username, origin }: HabitDetailProps) {
  const t = useTranslations("habitPage");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const tracker = useHabitTracker(habit, today);
  const summary = useHabitSummary(habit, today);
  const [archiving, startArchive] = useTransition();
  const { stats } = tracker;

  const skippedDays = useMemo(
    () =>
      [...tracker.history.entries]
        .filter(([, entry]) => entry.skipped)
        .map(([date, entry]) => ({ date, reason: entry.skipReason ?? null }))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [tracker.history.entries],
  );

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
      className="habit-scope flex flex-col gap-8"
      style={paletteVariables(habit.color)}
      aria-labelledby="habit-title"
      aria-busy={tracker.saving}
    >
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <StreakTile count={stats.currentStreak} size="lg" animate={tracker.animateStreak} />
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h1 id="habit-title" className="font-display text-3xl font-semibold tracking-tight break-words">
              {habit.name}
            </h1>
            <p className="mt-1 text-muted-foreground">{summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/habitos/${habit.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              {t("edit")}
            </Link>
            <Button variant="ghost" disabled={archiving} onClick={archive}>
              {t("archive")}
            </Button>
            <DeleteHabitDialog habitId={habit.id} name={habit.name} onDeleted={() => router.push("/painel")} />
          </div>
        </div>
      </header>

      <section aria-label={t("statsLabel")} className="grid grid-cols-2 gap-6 sm:max-w-lg">
        <Stat
          label={t("longestStreak")}
          value={String(stats.longestStreak)}
          unit={t("longestStreakValue", { count: stats.longestStreak })}
        />
        <Stat
          label={t("completion")}
          value={stats.completionRate === null ? "–" : percent.format(stats.completionRate)}
          detail={
            stats.completionRate === null
              ? t("noData")
              : t("completionDetail", { done: stats.doneDays, total: stats.measuredDays })
          }
        />
      </section>

      <section className="flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6">
        <TodayControl
          today={tracker.todayState}
          startDate={habit.startDate}
          unit={habit.unit}
          onChange={(value) => tracker.register(today, { value })}
        />
        <HabitGrid
          layout={tracker.layout}
          name={habit.name}
          unit={habit.unit}
          initialFocus={today}
          overflow="scroll"
          popDate={tracker.popDate}
          onPopEnd={tracker.clearPop}
          onSelectDay={(day, anchor) => tracker.setSelection({ day, anchor })}
        />
        <GridLegend {...tracker.legend} />
      </section>

      {skippedDays.length > 0 && (
        <section aria-labelledby="skipped-days" className="flex flex-col gap-3">
          <div>
            <h2 id="skipped-days" className="text-lg font-semibold">
              {t("skippedDays")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("skippedDaysHint")}</p>
          </div>
          <ul className="flex flex-col divide-y rounded-[1.25rem] bg-card">
            {skippedDays.map(({ date, reason }) => (
              <li key={date} className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:gap-6">
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums sm:w-44">
                  {formatShortDate(date)}
                </span>
                <span className={reason ? "break-words" : "text-muted-foreground"}>{reason ?? t("noReason")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ShareHabit habit={habit} username={username} origin={origin} />

      <DayMenu
        selection={tracker.selection}
        unit={habit.unit}
        onChange={(day, change) => tracker.register(day.date, change)}
        onClose={() => tracker.setSelection(null)}
      />
    </article>
  );
}

function Stat({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}
