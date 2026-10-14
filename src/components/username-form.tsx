"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeUsername } from "@/domain/username";
import { cn } from "@/lib/utils";
import { setUsernameAction } from "@/server/public/actions";

/**
 * Picks or changes the username, showing the profile address it forms as the person types.
 * Used in the settings and, the first time a habit is published, on the habit page.
 */
export function UsernameForm({
  className,
  current,
  origin,
  submitLabel,
  hint,
  onSaved,
}: {
  className?: string;
  current: string | null;
  /** "https://habithub-app.vercel.app", to show the profile address. */
  origin: string;
  submitLabel: string;
  hint?: ReactNode;
  /** Runs after the name is saved, still showing the form as busy. */
  onSaved: (username: string) => Promise<void> | void;
}) {
  const t = useTranslations("username");
  const tCommon = useTranslations("common");
  const id = useId();
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const username = normalizeUsername(value);
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <form
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await setUsernameAction(value);
          if (!result.ok) {
            setError(result.error === "unknown" ? tCommon("saveFailed") : t(result.error));
            return;
          }
          setError(null);
          await onSaved(result.username);
        });
      }}
    >
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>{t("label")}</FieldLabel>
        <Input
          id={id}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          maxLength={20}
          required
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
        <FieldDescription>
          {t("address")} <span className="text-foreground">{`${host}/u/${username || "…"}`}</span>
        </FieldDescription>
        {hint && <FieldDescription>{hint}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <Button type="submit" className="self-start" disabled={pending || !username || username === current}>
        {pending ? tCommon("saving") : submitLabel}
      </Button>
    </form>
  );
}
