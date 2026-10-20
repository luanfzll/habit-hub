"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

function errorKey(mode: Mode, code: string | undefined, status: number) {
  if (status === 429) return "tooManyAttempts";
  if (mode === "sign-in") return code === "INVALID_EMAIL_OR_PASSWORD" ? "invalidCredentials" : "genericError";
  if (code === "SIGNUPS_CLOSED") return "signupsClosed";
  if (code === "PASSWORD_TOO_SHORT") return "weakPassword";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "emailTaken";
  return "genericError";
}

/** E-mail and password form shared by the sign-in and sign-up pages. */
export function CredentialsForm({ mode }: { mode: Mode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  // Unique ids: Next keeps the previous page mounted (hidden), which may be the other auth form.
  const id = useId();
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
      setError(t(errorKey(mode, error.code, error.status)));
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  const signUp = mode === "sign-up";
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        {signUp ? t("signUpTitle") : t("signInTitle")}
      </h1>
      {/* POST: submitted before the page finishes loading, the browser must not put the password in the URL. */}
      <form method="post" onSubmit={submit} className="flex flex-col gap-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${id}-email`}>{t("email")}</FieldLabel>
            <Input id={`${id}-email`} name="email" type="email" required autoComplete="email" />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor={`${id}-password`}>{t("password")}</FieldLabel>
              {!signUp && (
                <Link
                  href="/recuperar-senha"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              )}
            </div>
            <Input
              id={`${id}-password`}
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
      {signUp && (
        <p className="text-center text-xs text-muted-foreground">
          {t.rich("privacyNotice", {
            link: (chunks) => (
              <Link href="/privacidade" className="underline underline-offset-4 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </div>
  );
}
