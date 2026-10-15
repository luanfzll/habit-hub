import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { HabitCard } from "@/components/habit/habit-card";
import { HabitEntriesProvider } from "@/components/habit/use-habit-entries";
import { TimezoneBanner } from "@/components/timezone-banner";
import { TodayHabits } from "@/components/today/today-habits";
import { TodayTasks } from "@/components/today/today-tasks";
import { buttonVariants } from "@/components/ui/button";
import { MAX_ACTIVE_HABITS } from "@/domain/habit-config";
import { HABIT_SUGGESTIONS, type HabitSuggestion } from "@/domain/habit-suggestions";
import { formatLongDate } from "@/lib/format";
import { listActiveHabits, listArchivedHabits } from "@/server/habits/service";
import { requireUser, userToday } from "@/server/session";
import { listTodayTasks } from "@/server/tasks/service";

const SUGGESTIONS = Object.keys(HABIT_SUGGESTIONS) as HabitSuggestion[];

export const metadata: Metadata = { title: "Hoje · HabitHub" };

export default function DashboardPage() {
  const t = useTranslations("today");
  return (
    <>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("title")}</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const today = userToday(user);
  const [habits, archived, tasks] = await Promise.all([
    listActiveHabits(user.id),
    listArchivedHabits(user.id),
    listTodayTasks(user.id, today),
  ]);
  const t = await getTranslations("dashboard");
  const tSuggestions = await getTranslations("suggestions");

  return (
    // One shared source of optimistic registrations: ticking a habit in "Today"
    // updates its card below at once.
    <HabitEntriesProvider habits={habits}>
      <p className="-mt-4 text-muted-foreground first-letter:uppercase">{formatLongDate(today)}</p>
      <TimezoneBanner profileTimezone={user.timezone} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayHabits habits={habits} today={today} />
        <TodayTasks tasks={tasks} today={today} />
      </div>

      <section aria-labelledby="habits-heading" className="mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="habits-heading" className="font-display text-xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <Link href="/habitos/novo" className={buttonVariants()}>
            {t("newHabit")}
          </Link>
        </div>

        {habits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-card px-6 py-14 text-center">
            <h3 className="text-lg font-medium">{t("emptyTitle")}</h3>
            <p className="text-muted-foreground">{t("emptyText")}</p>
            <Link href="/habitos/novo" className={buttonVariants()}>
              {t("createFirst")}
            </Link>
            <div className="mt-4 flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">{t("orSuggestion")}</p>
              <ul className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <Link
                      href={`/habitos/novo?sugestao=${key}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {tSuggestions(`${key}.label`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          habits.map((habit) => <HabitCard key={habit.id} habit={habit} today={today} />)
        )}
        {habits.length >= MAX_ACTIVE_HABITS && (
          <p className="text-sm text-muted-foreground">{t("limitReached", { max: MAX_ACTIVE_HABITS })}</p>
        )}
        {archived.length > 0 && (
          <Link
            href="/habitos/arquivados"
            className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("archivedLink", { count: archived.length })}
          </Link>
        )}
      </section>
    </HabitEntriesProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-[1.75rem] bg-card motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-[1.75rem] bg-card motion-reduce:animate-none" />
      </div>
      <div className="h-56 animate-pulse rounded-[1.75rem] bg-card motion-reduce:animate-none" />
    </div>
  );
}
