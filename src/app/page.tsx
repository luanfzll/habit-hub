import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Temporary home page. The launch version (example grid, footer) is part of milestone M5.
export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t("common.appName")}</h1>
      <p className="text-lg text-muted-foreground">{t("common.tagline")}</p>
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
