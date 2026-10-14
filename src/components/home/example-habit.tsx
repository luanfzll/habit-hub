"use client";

import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { PublicHabitCard } from "@/components/habit/public-habit-card";
import { todayIn } from "@/domain/calendar-date";
import { exampleHabit } from "@/lib/example-habit";

const browserToday = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

/**
 * The home page's example grid. "Today" is the visitor's, which only exists in the
 * browser, so the server (and the static page) render a placeholder of the same size.
 */
export function ExampleHabit() {
  const t = useTranslations("home");
  const today = useSyncExternalStore(
    () => () => {},
    browserToday,
    () => null,
  );
  const habit = useMemo(() => (today ? exampleHabit(today, t("exampleName"), t("exampleUnit")) : null), [today, t]);

  if (!habit || !today) return <div aria-hidden className="h-72 rounded-[1.75rem] bg-card sm:h-80" />;
  return <PublicHabitCard habit={habit} today={today} badge={t("exampleBadge")} />;
}
