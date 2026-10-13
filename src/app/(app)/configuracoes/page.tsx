import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { requireUser } from "@/server/session";
import { TimezoneForm } from "./timezone-form";

export const metadata: Metadata = { title: "Configurações · HabitHub" };

export default function SettingsPage() {
  const t = useTranslations("settings");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("title")}</h1>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser();
  const zones = Intl.supportedValuesOf("timeZone");
  const options = zones.includes(user.timezone) ? zones : [user.timezone, ...zones];
  return <TimezoneForm current={user.timezone} options={options} />;
}
