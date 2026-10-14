import { FlameIcon, SquareCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Wordmark } from "@/components/brand";
import { GithubIcon } from "@/components/github-icon";
import { ExampleToday } from "@/components/home/example-today";
import { ReadmePreview } from "@/components/home/readme-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import type { HabitColor } from "@/generated/prisma/enums";
import { paletteVariables } from "@/lib/palette";

const REPOSITORY_URL = "https://github.com/luanfzll/habit-hub";
const FEATURES: {
  key: "tap" | "streaks" | "readme";
  color: HabitColor;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: "tap", color: "green", Icon: SquareCheckIcon },
  { key: "streaks", color: "orange", Icon: FlameIcon },
  { key: "readme", color: "purple", Icon: GithubIcon },
];
const navLink = "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";

/** Home page for visitors (signed-in people go straight to the dashboard, see proxy.ts). */
export default function HomePage() {
  const t = useTranslations("home");
  return (
    <div className="flex flex-1 flex-col">
      <header>
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-20">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-1">
            <a href={REPOSITORY_URL} className={`${navLink} hidden md:inline`}>
              {t("sourceCode")}
            </a>
            <ThemeToggle />
            <Link href="/entrar" className={buttonVariants({ variant: "outline", className: "ml-1" })}>
              {t("signIn")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4">
        <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 py-10 sm:py-16 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col items-start gap-6">
            <p
              className="habit-scope flex items-center gap-2 rounded-full bg-[color-mix(in_oklch,var(--habit)_16%,transparent)] py-1 pr-3.5 pl-2.5 text-sm font-medium"
              style={paletteVariables("green")}
            >
              <span aria-hidden className="size-2.5 rounded-[3px] bg-[var(--habit)]" />
              {t("badge")}
            </p>
            {/* Each half on its own line, so "um" never ends up alone after "grade,". */}
            <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[2.15rem] xl:text-[2.5rem]">
              {t.rich("title", { line: (chunks) => <span className="block text-balance">{chunks}</span> })}
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
                {t("createAccount")}
              </Link>
              <a href="#readme" className={buttonVariants({ size: "lg", variant: "outline" })}>
                {t("howItWorks")}
              </a>
            </div>
          </div>
          <ExampleToday />
        </section>

        <hr />

        <section
          id="readme"
          aria-labelledby="readme-title"
          className="grid scroll-mt-6 grid-cols-[minmax(0,1fr)] items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.25fr)] lg:gap-14"
        >
          <div className="flex flex-col items-start gap-5">
            <h2
              id="readme-title"
              className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
            >
              {t("readmeTitle")}
            </h2>
            <p className="text-lg text-pretty text-muted-foreground">{t("readmeText")}</p>
            <pre className="w-full rounded-xl bg-muted px-4 py-3.5 font-mono text-sm break-all whitespace-pre-wrap text-emerald-700 dark:text-emerald-400">
              <code>{t("readmeCode")}</code>
            </pre>
          </div>
          <ReadmePreview />
        </section>

        <hr />

        <section aria-labelledby="features-title" className="py-14 sm:py-20">
          <h2 id="features-title" className="sr-only">
            {t("featuresTitle")}
          </h2>
          <ul className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {FEATURES.map(({ key, color, Icon }) => (
              <li key={key} className="habit-scope flex flex-col gap-3" style={paletteVariables(color)}>
                <Icon aria-hidden className="size-7 text-[var(--habit)]" />
                <h3 className="text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="text-pretty text-muted-foreground">{t(`features.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </section>
        {/* A last invitation, so whoever read this far doesn't have to scroll back up. */}
        <section
          aria-labelledby="cta-title"
          className="mb-14 flex flex-col items-start gap-6 rounded-[1.75rem] bg-card p-6 sm:mb-20 sm:flex-row sm:items-center sm:justify-between sm:p-10"
        >
          <div className="flex flex-col gap-2">
            <h2 id="cta-title" className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="text-pretty text-muted-foreground">{t("ctaText")}</p>
          </div>
          <Link href="/cadastro" className={buttonVariants({ size: "lg", className: "shrink-0" })}>
            {t("createAccount")}
          </Link>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t py-8 text-sm text-muted-foreground">
          <span>{t("author")}</span>
          <nav aria-label={t("footer")} className="flex gap-5">
            <a href={REPOSITORY_URL} className="underline-offset-4 hover:text-foreground hover:underline">
              {t("sourceCode")}
            </a>
            <Link href="/privacidade" className="underline-offset-4 hover:text-foreground hover:underline">
              {t("privacy")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
