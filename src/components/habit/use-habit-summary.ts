"use client";

import { useTranslations } from "next-intl";
import { maxDate, type CalendarDate } from "@/domain/calendar-date";
import { configOn, EVERY_DAY, weekdaysToList } from "@/domain/habit-config";
import { LOCALE } from "@/i18n/request";
import type { HabitView } from "@/server/habits/service";

const list = new Intl.ListFormat(LOCALE, { type: "conjunction" });

/** "20 páginas por dia" or "Feito ou não feito, Ter, Qui e Sáb", from the configuration in effect today. */
export function useHabitSummary(habit: HabitView, today: CalendarDate): string {
  const t = useTranslations("summary");
  const tGrid = useTranslations("grid");
  const config = configOn(habit.versions, maxDate(today, habit.startDate)) ?? habit.versions[0];

  const target =
    config.target === 1
      ? t("targetDone")
      : habit.unit
        ? t("targetAmountUnit", { target: config.target, unit: habit.unit })
        : t("targetAmount", { target: config.target });

  if (config.weekdays === EVERY_DAY) return target;
  const days = weekdaysToList(config.weekdays).map((day) => tGrid("weekdayShort", { day: String(day) }));
  return t("withSchedule", { target, schedule: list.format(days) });
}
