import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Suspense } from "react";
import { listArchivedHabits } from "@/server/habits/service";
import { requireUser } from "@/server/session";
import { ArchivedHabitList } from "./archived-habit-list";

export const metadata: Metadata = { title: "Hábitos arquivados · HabitHub" };

export default function ArchivedHabitsPage() {
  const t = useTranslations();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Link href="/painel" className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {t("habitPage.back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("archived.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("archived.intro")}</p>
      </div>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <ArchivedHabits />
      </Suspense>
    </div>
  );
}

async function ArchivedHabits() {
  const user = await requireUser();
  const habits = await listArchivedHabits(user.id);
  return (
    <ArchivedHabitList
      habits={habits.map(({ id, name, color, archivedAt }) => ({
        id,
        name,
        color,
        archivedAt: archivedAt?.toISOString() ?? "",
      }))}
      timezone={user.timezone}
    />
  );
}
