"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/calendar-date";
import type { DayState } from "@/domain/day-state";
import { MAX_VALUE } from "@/domain/habit-config";
import { formatDayMonth } from "@/lib/format";

interface TodayControlProps {
  /** Undefined while the habit has not started (e.g. after moving to an earlier time zone). */
  today: DayState | undefined;
  startDate: CalendarDate;
  unit: string | null;
  onChange: (value: number) => void;
}

const clamp = (value: number) => Math.min(MAX_VALUE, Math.max(0, value));

export function TodayControl({ today, startDate, unit, onChange }: TodayControlProps) {
  const t = useTranslations("habit");

  if (!today) {
    return <p className="text-sm text-muted-foreground">{t("startsOn", { date: formatDayMonth(startDate) })}</p>;
  }

  const control =
    today.target === 1 ? (
      <DoneButton done={today.value >= 1} onChange={onChange} />
    ) : (
      <QuantityControl key={today.value} today={today} unit={unit} onChange={onChange} />
    );

  if (today.kind !== "skipped") return control;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {control}
      <span className="text-sm text-muted-foreground">{t("skippedToday")}</span>
    </div>
  );
}

function DoneButton({ done, onChange }: { done: boolean; onChange: (value: number) => void }) {
  const t = useTranslations("habit");
  return (
    <Button
      variant="outline"
      aria-pressed={done}
      onClick={() => onChange(done ? 0 : 1)}
      // Done takes the habit's own color.
      className="min-w-36 self-start aria-pressed:border-transparent aria-pressed:bg-[var(--habit)] aria-pressed:text-[var(--habit-text)] aria-pressed:hover:bg-[var(--habit)]"
    >
      {done && <CheckIcon data-icon="inline-start" />}
      {done ? t("doneToday") : t("markToday")}
    </Button>
  );
}

function QuantityControl({
  today,
  unit,
  onChange,
}: {
  today: DayState;
  unit: string | null;
  onChange: (value: number) => void;
}) {
  const t = useTranslations("habit");
  const [draft, setDraft] = useState(String(today.value));
  const reached = today.value >= today.target;

  function commit() {
    const parsed = Number(draft);
    if (!Number.isInteger(parsed) || clamp(parsed) === today.value) {
      setDraft(String(today.value));
      return;
    }
    onChange(clamp(parsed));
  }

  return (
    <div className="flex items-center gap-3">
      <div
        data-reached={reached}
        className="flex items-center rounded-full border bg-card p-0.5 data-[reached=true]:border-transparent data-[reached=true]:bg-[var(--habit)] data-[reached=true]:text-[var(--habit-text)]"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("decrease")}
          disabled={today.value === 0}
          onClick={() => onChange(clamp(today.value - 1))}
          className="hover:bg-black/10 hover:text-current"
        >
          <MinusIcon />
        </Button>
        <input
          aria-label={t("todayValue")}
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_VALUE}
          step={1}
          className="h-8 w-14 [appearance:textfield] bg-transparent text-center font-display text-base font-semibold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("increase")}
          onClick={() => onChange(clamp(today.value + 1))}
          className="hover:bg-black/10 hover:text-current"
        >
          <PlusIcon />
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">
        {unit ? t("todayProgressUnit", { target: today.target, unit }) : t("todayProgress", { target: today.target })}
      </span>
    </div>
  );
}
