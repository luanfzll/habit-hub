import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { HabitForm } from "@/components/habit/habit-form";
import { createHabitAction } from "@/server/habits/actions";

export const metadata: Metadata = { title: "Novo hábito · HabitHub" };

export default function NewHabitPage() {
  const t = useTranslations("habitForm");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{t("createTitle")}</h1>
      <HabitForm mode="create" action={createHabitAction} />
    </div>
  );
}
