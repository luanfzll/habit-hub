import type { useTranslations } from "next-intl";
import type { DayState } from "@/domain/day-state";
import { formatShortDate } from "@/lib/format";

type GridTranslator = ReturnType<typeof useTranslations<"grid">>;

/** Text read by screen readers for one square of the grid. */
export function cellLabel(t: GridTranslator, day: DayState, unit: string | null): string {
  const date = formatShortDate(day.date);
  const amount = unit
    ? t("amountUnit", { value: day.value, target: day.target, unit })
    : t("amount", { value: day.value, target: day.target });

  switch (day.kind) {
    case "done":
      return day.target === 1 ? t("cell.done", { date }) : t("cell.doneValue", { date, amount });
    case "partial":
      return t("cell.partial", { date, amount });
    case "missed":
      return t("cell.missed", { date });
    case "pending":
      return day.value > 0 ? t("cell.pending", { date, amount }) : t("cell.pendingEmpty", { date });
    case "off-schedule":
      return t("cell.offSchedule", { date });
    case "extra": {
      const extra = unit ? t("extraAmountUnit", { value: day.value, unit }) : t("extraAmount", { value: day.value });
      return t("cell.extra", { date, amount: extra });
    }
    case "skipped":
      return t("cell.skipped", { date });
    case "before-start":
    case "future":
      return t("cell.beforeStart", { date });
  }
}
