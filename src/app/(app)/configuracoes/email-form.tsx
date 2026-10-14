"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** The account e-mail. A new address only replaces it after the link sent there is opened. */
export function EmailForm({ current, verified }: { current: string; verified: boolean }) {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const newEmail = String(new FormData(form).get("email")).trim();
    if (newEmail.toLowerCase() === current.toLowerCase()) {
      setError(t("sameEmail"));
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: "/email-confirmado" });
    setPending(false);
    if (error) {
      setError(tAuth(error.status === 429 ? "tooManyAttempts" : "genericError"));
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
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>{t("newEmail")}</FieldLabel>
        <Input id={id} name="email" type="email" required autoComplete="email" aria-invalid={Boolean(error)} />
        <FieldDescription>{t("newEmailHint")}</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
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
