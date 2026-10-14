import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LinkProblem } from "../link-problem";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nova senha · HabitHub" };

/** Where the reset link lands: Better Auth adds ?token=… or, for a bad link, ?error=…. */
export default function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
      <ResetPassword searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPassword({ searchParams }: Pick<PageProps<"/redefinir-senha">, "searchParams">) {
  const { token, error } = await searchParams;
  if (typeof token === "string" && !error) return <ResetPasswordForm token={token} />;
  const t = await getTranslations("auth");
  return <LinkProblem hint={t("resetLinkHint")} action={t("requestNewLink")} href="/recuperar-senha" />;
}
