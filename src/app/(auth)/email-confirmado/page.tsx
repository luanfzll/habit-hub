import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { LinkProblem } from "../link-problem";

export const metadata: Metadata = { title: "Confirmação de e-mail · HabitHub" };

/** Where confirmation links land (new accounts and e-mail changes); Better Auth adds ?error=… for bad links. */
export default function EmailConfirmedPage({ searchParams }: PageProps<"/email-confirmado">) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/email-confirmado">, "searchParams">) {
  const { error } = await searchParams;
  const t = await getTranslations("auth");
  if (error) return <LinkProblem hint={t("confirmLinkHint")} action={t("goToDashboard")} href="/painel" />;
  return (
    <div className="flex flex-col gap-4" role="status">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("emailConfirmed")}</h1>
      <p className="text-muted-foreground">{t("emailConfirmedHint")}</p>
      <Link href="/painel" className={buttonVariants({ size: "lg" })}>
        {t("goToDashboard")}
      </Link>
    </div>
  );
}
