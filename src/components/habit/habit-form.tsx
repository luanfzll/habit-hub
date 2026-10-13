"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Weekday } from "@/domain/calendar-date";
import { EVERY_DAY, MAX_ACTIVE_HABITS, MAX_TARGET, weekdaysFromList, weekdaysToList } from "@/domain/habit-config";
import type { HabitColor } from "@/generated/prisma/enums";
import { HABIT_COLORS, habitPalette } from "@/lib/palette";
import type { HabitFormState } from "@/server/habits/form-state";

export interface HabitFormValues {
  name: string;
  color: HabitColor;
  unit: string | null;
  target: number;
  weekdays: number;
}

const NEW_HABIT: HabitFormValues = { name: "", color: "green", unit: null, target: 1, weekdays: EVERY_DAY };
const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

interface HabitFormProps {
  mode: "create" | "edit";
  action: (state: HabitFormState, formData: FormData) => Promise<HabitFormState>;
  defaults?: HabitFormValues;
}

export function HabitForm({ mode, action, defaults = NEW_HABIT }: HabitFormProps) {
  const t = useTranslations("habitForm");
  const tCommon = useTranslations("common");
  const tGrid = useTranslations("grid");
  const [state, formAction, pending] = useActionState(action, {});
  const [everyDay, setEveryDay] = useState(defaults.weekdays === EVERY_DAY);
  const [days, setDays] = useState<Weekday[]>(weekdaysToList(defaults.weekdays));
  const [color, setColor] = useState<HabitColor>(defaults.color);

  const weekdays = everyDay ? EVERY_DAY : weekdaysFromList(days);
  const missingDays = !everyDay && days.length === 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={40}
            defaultValue={defaults.name}
            placeholder={t("namePlaceholder")}
            autoComplete="off"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="target">{t("target")}</FieldLabel>
            <Input
              id="target"
              name="target"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={MAX_TARGET}
              step={1}
              defaultValue={defaults.target}
            />
            <FieldDescription>{t("targetHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="unit">{t("unit")}</FieldLabel>
            <Input
              id="unit"
              name="unit"
              maxLength={15}
              defaultValue={defaults.unit ?? ""}
              placeholder={t("unitPlaceholder")}
              autoComplete="off"
            />
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">{t("frequency")}</FieldLegend>
          <RadioGroup
            value={everyDay ? "every" : "specific"}
            onValueChange={(value) => setEveryDay(value === "every")}
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="every" />
              {t("everyDay")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="specific" />
              {t("specificDays")}
            </label>
          </RadioGroup>
          {!everyDay && (
            <>
              <ToggleGroup
                multiple
                variant="outline"
                spacing={1}
                aria-label={t("weekdaysLabel")}
                value={days.map(String)}
                onValueChange={(value) => setDays(value.map((day) => Number(day) as Weekday))}
              >
                {WEEKDAYS.map((day) => (
                  <ToggleGroupItem key={day} value={String(day)} className="min-w-11">
                    {tGrid("weekdayShort", { day: String(day) })}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {missingDays && <p className="text-sm text-destructive">{t("weekdaysRequired")}</p>}
            </>
          )}
          <input type="hidden" name="weekdays" value={weekdays} />
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{t("color")}</FieldLegend>
          <RadioGroup
            name="color"
            value={color}
            onValueChange={(value) => setColor(value as HabitColor)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {HABIT_COLORS.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={option} aria-label={t(`colors.${option}`)} />
                <span
                  aria-hidden
                  className="size-5 rounded-md"
                  style={{ background: habitPalette(option, "light").base }}
                />
                <span aria-hidden>{t(`colors.${option}`)}</span>
              </label>
            ))}
          </RadioGroup>
        </FieldSet>
      </FieldGroup>

      {mode === "edit" && <p className="text-sm text-muted-foreground">{t("configChangeNote")}</p>}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error === "limitReached" ? t("limitReached", { max: MAX_ACTIVE_HABITS }) : t("invalid")}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || missingDays}>
          {pending ? tCommon("saving") : mode === "create" ? t("create") : tCommon("save")}
        </Button>
        <Link href="/painel" className={buttonVariants({ variant: "ghost" })}>
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
