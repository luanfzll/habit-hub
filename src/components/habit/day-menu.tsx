"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DayState } from "@/domain/day-state";
import { MAX_SKIP_REASON, MAX_VALUE } from "@/domain/habit-config";
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
  const tGrid = useTranslations("grid");
  const [value, setValue] = useState(String(day.value));
  const [skipFormOpen, setSkipFormOpen] = useState(false);
  const skipped = day.kind === "skipped";
  const done = !skipped && day.value >= day.target;
  // Skipping only makes sense on days the habit was scheduled.
  const canSkip = day.scheduled && !skipped;

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_VALUE) onChange({ value: parsed });
  }

  const title = (
    <PopoverPrimitive.Title className="font-medium first-letter:uppercase">
      {formatLongDate(day.date)}
    </PopoverPrimitive.Title>
  );

  if (skipFormOpen) {
    // Skipping discards the registered value, so say so before confirming.
    const warning =
      day.value === 0
        ? null
        : day.target === 1
          ? t("skipDiscardDone")
          : t("skipDiscard", {
              amount: unit
                ? tGrid("extraAmountUnit", { value: day.value, unit })
                : tGrid("extraAmount", { value: day.value }),
            });
    return (
      <>
        {title}
        <SkipForm
          day={day}
          warning={warning}
          submitLabel={skipped ? t("saveReason") : t("skipSubmit")}
          onSubmit={(reason) => onChange({ skip: true, reason })}
          onCancel={() => setSkipFormOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {title}

      {skipped && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{t("skipped")}</span>
            <Button size="sm" variant="outline" onClick={() => onChange({ value: 0 })}>
              {t("unskip")}
            </Button>
          </div>
          <p className={day.skipReason ? "break-words" : "text-muted-foreground"}>{day.skipReason ?? t("noReason")}</p>
          <Button variant="link" size="sm" className="self-start px-0" onClick={() => setSkipFormOpen(true)}>
            {day.skipReason ? t("editReason") : t("addReason")}
          </Button>
        </div>
      )}

      {day.target === 1 ? (
        <div className="flex items-center justify-between gap-2">
          {!skipped && <span className="text-muted-foreground">{done ? t("statusDone") : t("statusNotDone")}</span>}
          <Button
            size="sm"
            variant={done ? "outline" : "default"}
            className={skipped ? "ml-auto" : undefined}
            onClick={() => onChange({ value: done ? 0 : 1 })}
          >
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

      {canSkip && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setSkipFormOpen(true)}>
            {t("skip")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("skipHint")}</p>
        </div>
      )}
    </>
  );
}

function SkipForm({
  day,
  warning,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  day: DayState;
  warning: string | null;
  submitLabel: string;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("dayMenu");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState(day.skipReason ?? "");
  const id = `skip-reason-${day.date}`;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(reason);
      }}
    >
      <Label htmlFor={id}>{t("reasonLabel")}</Label>
      <Textarea
        id={id}
        rows={3}
        maxLength={MAX_SKIP_REASON}
        placeholder={t("reasonPlaceholder")}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        autoFocus
      />
      {warning && <p className="text-sm text-destructive">{warning}</p>}
      <p className="text-xs text-muted-foreground">{t("skipHint")}</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
      </div>
    </form>
  );
}
