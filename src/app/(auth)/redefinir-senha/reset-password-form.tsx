"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { LinkProblem } from "../link-problem";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newPassword = String(new FormData(event.currentTarget).get("password"));
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (!error) {
      toast.success(t("passwordReset"));
      router.replace("/entrar");
    } else if (error.code === "INVALID_TOKEN") {
      setInvalidLink(true);
    } else {
      setError(t(error.code === "PASSWORD_TOO_SHORT" ? "weakPassword" : "genericError"));
    }
  }

  if (invalidLink) {
    return <LinkProblem hint={t("resetLinkHint")} action={t("requestNewLink")} href="/recuperar-senha" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("resetHint")}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor={id}>{t("newPassword")}</FieldLabel>
          <Input
            id={id}
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
          <FieldDescription>{t("passwordHint")}</FieldDescription>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {t("resetSubmit")}
        </Button>
      </form>
    </div>
  );
}
