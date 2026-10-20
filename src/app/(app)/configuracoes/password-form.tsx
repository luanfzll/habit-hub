"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** Needs the current password; every other session is signed out. */
export function PasswordForm() {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("current")),
      newPassword: String(data.get("new")),
      revokeOtherSessions: true,
    });
    setPending(false);
    if (!error) {
      form.reset();
      toast.success(t("passwordChanged"));
    } else if (error.code === "INVALID_PASSWORD") {
      setError(t("wrongPassword"));
    } else if (error.code === "PASSWORD_TOO_SHORT") {
      setError(tAuth("weakPassword"));
    } else {
      setError(tAuth(error.status === 429 ? "tooManyAttempts" : "genericError"));
    }
  }

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-current`}>{t("currentPassword")}</FieldLabel>
          <Input
            id={`${id}-current`}
            name="current"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </Field>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={`${id}-new`}>{t("newPassword")}</FieldLabel>
          <Input
            id={`${id}-new`}
            name="new"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
          <FieldDescription>{t("newPasswordHint")}</FieldDescription>
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </FieldGroup>
      <Button type="submit" className="self-start" disabled={pending}>
        {t("changePassword")}
      </Button>
    </form>
  );
}
