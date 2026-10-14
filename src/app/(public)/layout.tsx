import { useTranslations } from "next-intl";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

/** Pages anyone can open without an account (the public profile). */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-1 flex-col">
      <header>
        <nav className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-2 px-4">
          <Link href="/" aria-label={t("appName")} className="shrink-0">
            <Wordmark className="text-lg" />
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
