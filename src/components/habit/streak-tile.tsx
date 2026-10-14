"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The habit's scoreboard: the current streak on a block of the habit's color.
 * The number rolls up only after the person registers something (`animate`).
 */
export function StreakTile({
  count,
  size = "md",
  animate = false,
}: {
  count: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}) {
  const t = useTranslations("habit");
  return (
    <p
      data-streak
      className={cn(
        "flex shrink-0 flex-col items-center justify-center overflow-hidden bg-[var(--habit)] text-center text-[var(--habit-text)]",
        size === "lg"
          ? "size-28 rounded-[1.75rem] sm:size-32"
          : size === "sm"
            ? "size-16 rounded-[1.125rem]"
            : "size-20 rounded-[1.25rem]",
      )}
    >
      <span
        key={count}
        className={cn(
          "font-display leading-none font-semibold tabular-nums",
          size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl",
          animate && "number-roll",
        )}
      >
        {count}
      </span>
      <span
        className={cn(
          "mt-1.5 leading-none font-medium",
          size === "lg" ? "text-xs" : size === "sm" ? "text-[0.5625rem]" : "text-[0.625rem]",
        )}
      >
        {t("streakCaption", { count })}
      </span>
    </p>
  );
}
