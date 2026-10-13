"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { DeleteHabitDialog } from "@/components/habit/delete-habit-dialog";
import { Button } from "@/components/ui/button";
import { MAX_ACTIVE_HABITS } from "@/domain/habit-config";
import type { HabitColor } from "@/generated/prisma/enums";
import { LOCALE } from "@/i18n/request";
import { PALETTE } from "@/lib/palette";
import { unarchiveHabitAction } from "@/server/habits/actions";

interface ArchivedHabit {
  id: string;
  name: string;
  color: HabitColor;
  archivedAt: string;
}

export function ArchivedHabitList({ habits, timezone }: { habits: ArchivedHabit[]; timezone: string }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const date = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: timezone });

  if (habits.length === 0) {
    return <p className="text-muted-foreground">{t("archived.empty")}</p>;
  }

  function unarchive(habit: ArchivedHabit) {
    startTransition(async () => {
      const result = await unarchiveHabitAction(habit.id);
      if (result.ok) toast.success(t("archived.unarchived", { name: habit.name }));
      else if (result.error === "limitReached") toast.error(t("dashboard.limitReached", { max: MAX_ACTIVE_HABITS }));
      else toast.error(t("common.saveFailed"));
    });
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {habits.map((habit) => (
        <li key={habit.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ background: PALETTE[habit.color].light[2] }}
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{habit.name}</p>
              <p className="text-sm text-muted-foreground">
                {t("archived.archivedOn", { date: date.format(new Date(habit.archivedAt)) })}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => unarchive(habit)}>
              {t("archived.unarchive")}
            </Button>
            <DeleteHabitDialog habitId={habit.id} name={habit.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
