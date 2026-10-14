import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { getUsername } from "@/server/public/service";
import { requestOrigin } from "@/server/request-origin";
import { requireUser } from "@/server/session";
import { TimezoneForm } from "./timezone-form";
import { UsernameSettings } from "./username-settings";

export const metadata: Metadata = { title: "Configurações · HabitHub" };

export default function SettingsPage() {
  const t = useTranslations();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link href="/painel" className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {t("habitPage.back")}
      </Link>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("settings.title")}</h1>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser();
  const [username, origin] = await Promise.all([getUsername(user.id), requestOrigin()]);
  const zones = Intl.supportedValuesOf("timeZone");
  const options = zones.includes(user.timezone) ? zones : [user.timezone, ...zones];
  return (
    <div className="flex flex-col gap-8">
      <TimezoneForm current={user.timezone} options={options} />
      <Separator />
      <UsernameSettings current={username} origin={origin} />
    </div>
  );
}
