"use client";

import { FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { historyOf } from "@/components/habit/use-habit-entries";
import { computeStats } from "@/domain/day-state";
import { gridStart } from "@/domain/grid";
import { renderEmbedSvg, type EmbedTheme } from "@/lib/embed-svg";
import { exampleHabits } from "@/lib/example-habits";
import { useBrowserToday } from "./use-browser-today";

/**
 * A GitHub profile README with the example "Ler" habit, drawn by the same function as
 * the real README image, in the theme the page is showing.
 */
export function ReadmePreview() {
  const t = useTranslations();
  const today = useBrowserToday();
  const svgs = useMemo(() => {
    if (!today) return null;
    const [habit] = exampleHabits(today, (key) => ({
      name: t(`home.examples.${key}.name`),
      unit: t(`home.examples.${key}.unit`),
    }));
    const history = historyOf(habit);
    const { currentStreak } = computeStats(history, today, gridStart({ today }));
    const draw = (theme: EmbedTheme) =>
      renderEmbedSvg({
        name: habit.name,
        color: habit.color,
        history,
        today,
        theme,
        streakText: t("embed.streak", { count: currentStreak }),
        weekdayLabels: [0, 1, 2, 3, 4, 5, 6].map((day) => t("grid.weekdayShort", { day: String(day) })),
      });
    return { light: draw("light"), dark: draw("dark") };
  }, [today, t]);

  const image = "[&_svg]:h-auto [&_svg]:w-full";
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileTextIcon aria-hidden className="size-4" />
        {t("home.readmeFile")}
      </p>
      <div>
        <p className="text-xl font-semibold">{t("home.readmeGreeting")}</p>
        <p className="text-muted-foreground">{t("home.readmeBio")}</p>
      </div>
      {svgs ? (
        <>
          {/* Our own SVG, built from made-up data with every text escaped. */}
          <div className={`${image} dark:hidden`} dangerouslySetInnerHTML={{ __html: svgs.light }} />
          <div className={`${image} hidden dark:block`} dangerouslySetInnerHTML={{ __html: svgs.dark }} />
        </>
      ) : (
        <div aria-hidden className="aspect-[746/171]" />
      )}
    </div>
  );
}
