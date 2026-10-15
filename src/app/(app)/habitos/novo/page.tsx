import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { HabitForm, type HabitFormValues } from "@/components/habit/habit-form";
import { HABIT_SUGGESTIONS, isHabitSuggestion } from "@/domain/habit-suggestions";
import { createHabitAction } from "@/server/habits/actions";

export const metadata: Metadata = { title: "Novo hábito · HabitHub" };

export default function NewHabitPage({ searchParams }: PageProps<"/habitos/novo">) {
  const t = useTranslations("habitForm");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("createTitle")}</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <NewHabitForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** "?sugestao=ler" fills the form with one of the suggestions from the empty dashboard. */
async function NewHabitForm({ searchParams }: Pick<PageProps<"/habitos/novo">, "searchParams">) {
  const { sugestao } = await searchParams;
  if (!isHabitSuggestion(sugestao)) return <HabitForm mode="create" action={createHabitAction} />;

  const t = await getTranslations(`suggestions.${sugestao}`);
  const { color, target, weekdays, hasUnit } = HABIT_SUGGESTIONS[sugestao];
  const defaults: HabitFormValues = { name: t("name"), color, target, weekdays, unit: hasUnit ? t("unit") : null };
  return <HabitForm mode="create" action={createHabitAction} defaults={defaults} />;
}
