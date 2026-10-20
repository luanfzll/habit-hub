"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** Asks for the reset link. The answer is the same whether or not the account exists. */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
    setPending(false);
    if (error) setError(t(error.status === 429 ? "tooManyAttempts" : "genericError"));
    else setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("checkInbox")}</h1>
        <p className="text-muted-foreground">{t("resetSent", { email: sentTo })}</p>
        <Link href="/entrar" className="text-sm font-medium underline-offset-4 hover:underline">
          ← {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("forgotTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("forgotHint")}</p>
      </div>
      <form method="post" onSubmit={submit} className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor={id}>{t("email")}</FieldLabel>
          <Input id={id} name="email" type="email" required autoComplete="email" />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {t("sendResetLink")}
        </Button>
      </form>
      <Link href="/entrar" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {t("backToSignIn")}
      </Link>
    </div>
  );
}
