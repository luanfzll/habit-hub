import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { HabitForm } from "@/components/habit/habit-form";
import { updateHabitAction } from "@/server/habits/actions";
import { getHabitForEdit, HabitNotFoundError } from "@/server/habits/service";
import { requireUser, userToday } from "@/server/session";

export const metadata: Metadata = { title: "Editar hábito · HabitHub" };

export default function EditHabitPage({ params }: PageProps<"/habitos/[id]/editar">) {
  const t = useTranslations("habitForm");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("editTitle")}</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  let habit;
  try {
    habit = await getHabitForEdit(user.id, id, userToday(user));
  } catch (error) {
    if (error instanceof HabitNotFoundError) notFound();
    throw error;
  }

  return <HabitForm mode="edit" action={updateHabitAction.bind(null, habit.id)} defaults={habit} />;
}
