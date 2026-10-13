import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { HabitCard } from "@/components/habit/habit-card";
import { TimezoneBanner } from "@/components/timezone-banner";
import { buttonVariants } from "@/components/ui/button";
import { MAX_ACTIVE_HABITS } from "@/domain/habit-config";
import { listActiveHabits } from "@/server/habits/service";
import { requireUser, userToday } from "@/server/session";

export const metadata: Metadata = { title: "Seus hábitos · HabitHub" };

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
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
  const habits = await listActiveHabits(user.id);
  const t = await getTranslations("dashboard");

  return (
    <>
      <TimezoneBanner profileTimezone={user.timezone} />
      {habits.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
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
          {habits.length >= MAX_ACTIVE_HABITS && (
            <p className="text-sm text-muted-foreground">{t("limitReached", { max: MAX_ACTIVE_HABITS })}</p>
          )}
        </div>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {[0, 1].map((key) => (
        <div key={key} className="h-56 animate-pulse rounded-xl border bg-muted/40 motion-reduce:animate-none" />
      ))}
    </div>
  );
}
