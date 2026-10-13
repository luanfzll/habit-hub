import { useTranslations } from "next-intl";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button";

// Static chrome: everything that depends on the session lives inside each page's Suspense boundary.
export default function AppLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("common");
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <Link href="/painel" className="font-semibold tracking-tight">
            {t("appName")}
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/configuracoes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("settings")}
            </Link>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
