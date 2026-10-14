import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { getUsername } from "@/server/public/service";
import { requestOrigin } from "@/server/request-origin";
import { requireUser } from "@/server/session";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { AccountData } from "./account-data";
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
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
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
    <SettingsSections
      account={
        <>
          <EmailForm current={user.email} verified={user.emailVerified} />
          <Separator />
          <PasswordForm />
        </>
      }
      profile={<UsernameSettings current={username} origin={origin} />}
      preferences={<TimezoneForm current={user.timezone} options={options} />}
      data={<AccountData email={user.email} />}
    />
  );
}

function SettingsSections(sections: {
  account: ReactNode;
  profile: ReactNode;
  preferences: ReactNode;
  data: ReactNode;
}) {
  const t = useTranslations("settings");
  return (
    <>
      {(["account", "profile", "preferences", "data"] as const).map((key) => (
        <section
          key={key}
          aria-labelledby={`settings-${key}`}
          className="flex flex-col gap-5 rounded-[1.75rem] bg-card p-5 text-card-foreground sm:p-6"
        >
          <h2 id={`settings-${key}`} className="text-lg font-semibold">
            {t(`sections.${key}`)}
          </h2>
          {sections[key]}
        </section>
      ))}
    </>
  );
}
