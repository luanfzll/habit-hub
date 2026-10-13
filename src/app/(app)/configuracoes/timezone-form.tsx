"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { updateTimezoneAction } from "@/server/settings/actions";

export function TimezoneForm({ current, options }: { current: string; options: string[] }) {
  const t = useTranslations();
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await updateTimezoneAction(value);
          if (result.ok) toast.success(t("settings.saved"));
          else toast.error(t("settings.invalidTimezone"));
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="timezone">{t("settings.timezone")}</FieldLabel>
        <select
          id="timezone"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {options.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <FieldDescription>{t("settings.timezoneHint")}</FieldDescription>
      </Field>
      <Button type="submit" className="self-start" disabled={pending || value === current}>
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
