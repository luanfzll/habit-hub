import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { HabitCard } from "@/components/habit/habit-card";
import { GridLegend } from "@/components/habit/habit-grid";
import { TimezoneBanner } from "@/components/timezone-banner";
import { buttonVariants } from "@/components/ui/button";
import { MAX_ACTIVE_HABITS } from "@/domain/habit-config";
import { listActiveHabits, listArchivedHabits } from "@/server/habits/service";
import { requireUser, userToday } from "@/server/session";

export const metadata: Metadata = { title: "Seus hábitos · HabitHub" };

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("title")}</h1>
        <Link href="/habitos/novo" className={buttonVariants()}>
          {t("newHabit")}
        </Link>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const today = userToday(user);
  const [habits, archived] = await Promise.all([listActiveHabits(user.id), listArchivedHabits(user.id)]);
  const t = await getTranslations("dashboard");

  return (
    <>
      <TimezoneBanner profileTimezone={user.timezone} />
      {habits.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-card px-6 py-14 text-center">
          <h2 className="text-lg font-medium">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground">{t("emptyText")}</p>
          <Link href="/habitos/novo" className={buttonVariants()}>
            {t("createFirst")}
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} />
          ))}
          <GridLegend className="px-1" />
          {habits.length >= MAX_ACTIVE_HABITS && (
            <p className="text-sm text-muted-foreground">{t("limitReached", { max: MAX_ACTIVE_HABITS })}</p>
          )}
        </div>
      )}
      {archived.length > 0 && (
        <Link
          href="/habitos/arquivados"
          className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("archivedLink", { count: archived.length })}
        </Link>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1].map((key) => (
        <div key={key} className="h-56 animate-pulse rounded-[1.75rem] bg-card motion-reduce:animate-none" />
      ))}
    </div>
  );
}
