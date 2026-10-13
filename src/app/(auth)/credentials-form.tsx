"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

function errorKey(mode: Mode, code: string | undefined) {
  if (mode === "sign-in") return code === "INVALID_EMAIL_OR_PASSWORD" ? "invalidCredentials" : "genericError";
  if (code === "PASSWORD_TOO_SHORT") return "weakPassword";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "emailTaken";
  return "genericError";
}

/** E-mail and password form shared by the sign-in and sign-up pages. */
export function CredentialsForm({ mode }: { mode: Mode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setPending(true);
    setError(null);
    const { error } =
      mode === "sign-up"
        ? await authClient.signUp.email({
            email,
            password,
            // Better Auth requires a name; the app never shows it.
            name: email.split("@")[0],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        : await authClient.signIn.email({ email, password });
    setPending(false);

    if (error) {
      setError(t(errorKey(mode, error.code)));
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  const signUp = mode === "sign-up";
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{signUp ? t("signUpTitle") : t("signInTitle")}</h1>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={signUp ? 8 : undefined}
              maxLength={128}
              autoComplete={signUp ? "new-password" : "current-password"}
            />
            {signUp && <FieldDescription>{t("passwordHint")}</FieldDescription>}
          </Field>
        </FieldGroup>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {signUp ? t("signUpSubmit") : t("signInSubmit")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {signUp ? t("signUpFooter") : t("signInFooter")}{" "}
        <Link
          href={signUp ? "/entrar" : "/cadastro"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {signUp ? t("signInTitle") : t("signUpTitle")}
        </Link>
      </p>
    </div>
  );
}
