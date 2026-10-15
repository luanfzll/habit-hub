"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The habit's scoreboard: the current streak on a block of the habit's color, with
 * "dias" and "seguidos" on two lines so the caption can be larger than it fits on one.
 * The number rolls up only after the person registers something (`animate`).
 */
const CAPTION = {
  sm: { big: "text-xs", small: "text-[0.6875rem]" },
  md: { big: "text-sm", small: "text-xs" },
  lg: { big: "text-base", small: "text-sm" },
} as const;

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
            ? "size-[4.5rem] rounded-[1.25rem]"
            : "size-20 rounded-[1.25rem]",
      )}
    >
      <span
        key={count}
        className={cn(
          "font-display font-semibold tabular-nums",
          size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl",
          // After the font size: tailwind-merge drops a line height that comes before it.
          "leading-none",
          animate && "number-roll",
        )}
      >
        {count}
      </span>
      <span className={cn("flex flex-col items-center gap-[3px] font-medium", size === "lg" ? "mt-2" : "mt-1.5")}>
        {t.rich("streakCaption", {
          count,
          // The space between the two words stays in the text, for screen readers and copying.
          big: (chunks) => <span className={cn(CAPTION[size].big, "leading-none")}>{chunks}</span>,
          small: (chunks) => <span className={cn(CAPTION[size].small, "leading-none")}>{chunks}</span>,
        })}
      </span>
    </p>
  );
}
