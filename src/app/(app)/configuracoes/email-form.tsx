"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/**
 * The account e-mail. Asks for the current password (checked by the server, see auth.ts),
 * and a new address only replaces the old one after the link sent there is opened.
 */
export function EmailForm({ current, verified }: { current: string; verified: boolean }) {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Shown under the field it is about: the new address, or the password (and other failures).
  const [error, setError] = useState<{ field: "email" | "password"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newEmail = String(data.get("email")).trim();
    if (newEmail.toLowerCase() === current.toLowerCase()) {
      setError({ field: "email", message: t("sameEmail") });
      return;
    }
    setPending(true);
    setError(null);
    // Through $fetch because the typed changeEmail() has no field for the password.
    const { error } = await authClient.$fetch("/change-email", {
      method: "POST",
      body: { newEmail, callbackURL: "/email-confirmado", password: String(data.get("password")) },
    });
    setPending(false);
    if (error) {
      const message =
        error.status === 429
          ? tAuth("tooManyAttempts")
          : (error as { code?: string }).code === "INVALID_PASSWORD"
            ? t("wrongPassword")
            : tAuth("genericError");
      setError({ field: "password", message });
      return;
    }
    form.reset();
    setSentTo(newEmail);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("email")}</span>
        <p className="break-all">
          {current}{" "}
          <span className="text-sm text-muted-foreground">({verified ? t("verified") : t("notVerified")})</span>
        </p>
      </div>
      <Field data-invalid={error?.field === "email"}>
        <FieldLabel htmlFor={id}>{t("newEmail")}</FieldLabel>
        <Input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={error?.field === "email"}
        />
        <FieldDescription>{t("newEmailHint")}</FieldDescription>
        {error?.field === "email" && <FieldError>{error.message}</FieldError>}
      </Field>
      <Field data-invalid={error?.field === "password"}>
        <FieldLabel htmlFor={`${id}-password`}>{t("currentPassword")}</FieldLabel>
        <Input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
          aria-invalid={error?.field === "password"}
        />
        {error?.field === "password" && <FieldError>{error.message}</FieldError>}
      </Field>
      {sentTo && (
        <p role="status" className="text-sm">
          {t("changeSent", { email: sentTo })}
        </p>
      )}
      <Button type="submit" className="self-start" disabled={pending}>
        {t("changeEmail")}
      </Button>
    </form>
  );
}
