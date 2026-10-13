"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DayState } from "@/domain/day-state";
import { MAX_VALUE } from "@/domain/habit-config";
import { formatLongDate } from "@/lib/format";
import type { EntryChange } from "@/server/habits/input";

interface DayMenuProps {
  selection: { day: DayState; anchor: HTMLButtonElement } | null;
  unit: string | null;
  onChange: (day: DayState, change: EntryChange) => void;
  onClose: () => void;
}

/** One popover per grid, anchored to the square that was clicked. */
export function DayMenu({ selection, unit, onChange, onClose }: DayMenuProps) {
  return (
    <PopoverPrimitive.Root open={selection !== null} onOpenChange={(open) => !open && onClose()}>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner anchor={selection?.anchor} side="top" sideOffset={8} className="isolate z-50">
          <PopoverPrimitive.Popup
            finalFocus={() => selection?.anchor ?? true}
            className="flex w-64 flex-col gap-3 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none"
          >
            {selection && (
              <DayMenuBody
                // Remount when another day is opened so the input starts from that day's value.
                key={selection.day.date}
                day={selection.day}
                unit={unit}
                onChange={(change) => {
                  onChange(selection.day, change);
                  onClose();
                }}
              />
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function DayMenuBody({
  day,
  unit,
  onChange,
}: {
  day: DayState;
  unit: string | null;
  onChange: (change: EntryChange) => void;
}) {
  const t = useTranslations("dayMenu");
  const [value, setValue] = useState(String(day.value));
  const done = day.value >= day.target;

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_VALUE) onChange({ value: parsed });
  }

  return (
    <>
      <PopoverPrimitive.Title className="font-medium first-letter:uppercase">
        {formatLongDate(day.date)}
      </PopoverPrimitive.Title>

      {day.target === 1 ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{done ? t("statusDone") : t("statusNotDone")}</span>
          <Button size="sm" variant={done ? "outline" : "default"} onClick={() => onChange({ value: done ? 0 : 1 })}>
            {done ? t("unmark") : t("markDone")}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Label htmlFor={`day-value-${day.date}`}>
            {t("value")}
            {unit ? ` (${unit})` : ""}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`day-value-${day.date}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_VALUE}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit" size="default">
              {t("save")}
            </Button>
          </div>
          {day.value > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => onChange({ value: 0 })}
            >
              {t("clear")}
            </Button>
          )}
        </form>
      )}
    </>
  );
}
