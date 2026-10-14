import { useTranslations } from "next-intl";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Shown when an e-mail link was already used, has expired or was cut when copied. */
export function LinkProblem({ hint, action, href }: { hint: string; action: string; href: string }) {
  const t = useTranslations("auth");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("invalidLink")}</h1>
      <p className="text-muted-foreground">{hint}</p>
      <Link href={href} className={buttonVariants({ size: "lg" })}>
        {action}
      </Link>
    </div>
  );
}
