import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

// Static chrome: everything that depends on the session lives inside each page's Suspense boundary.
export default function AppLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-1 flex-col">
      <header>
        <nav className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-2 px-4">
          <Link href="/painel" aria-label={t("appName")} className="shrink-0">
            <Wordmark className="text-lg" />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/configuracoes"
              aria-label={t("settings")}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "px-2.5 sm:px-3" })}
            >
              <SettingsIcon className="sm:hidden" />
              <span className="hidden sm:inline">{t("settings")}</span>
            </Link>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
