import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";

// Temporary home page. The launch version (example grid, footer) is part of milestone M5.
export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 aria-label={t("common.appName")}>
        <Wordmark className="text-4xl sm:text-5xl" />
      </h1>
      <p className="max-w-sm text-lg text-muted-foreground">{t("home.tagline")}</p>
      <div className="flex gap-3">
        <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
          {t("home.createAccount")}
        </Link>
        <Link href="/entrar" className={buttonVariants({ size: "lg", variant: "outline" })}>
          {t("home.signIn")}
        </Link>
      </div>
    </main>
  );
}
