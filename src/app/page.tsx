import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ExampleHabit } from "@/components/home/example-habit";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

const REPOSITORY_URL = "https://github.com/luanfzll/habit-hub";

/** Home page for visitors (signed-in people go straight to the dashboard, see proxy.ts). */
export default function HomePage() {
  const t = useTranslations("home");
  return (
    <div className="flex flex-1 flex-col">
      <header>
        <nav className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-2 px-4">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/entrar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("signIn")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-10 sm:gap-12 sm:py-16">
        <section className="flex flex-col items-start gap-6">
          <h1 className="max-w-3xl font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-muted-foreground">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
              {t("createAccount")}
            </Link>
            <Link href="/entrar" className={buttonVariants({ size: "lg", variant: "outline" })}>
              {t("signIn")}
            </Link>
          </div>
        </section>
        <ExampleHabit />
      </main>

      <footer className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground">
        <span>{t("author")}</span>
        <nav aria-label={t("footer")} className="flex gap-5">
          <a href={REPOSITORY_URL} className="underline-offset-4 hover:text-foreground hover:underline">
            {t("sourceCode")}
          </a>
          <Link href="/privacidade" className="underline-offset-4 hover:text-foreground hover:underline">
            {t("privacy")}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
