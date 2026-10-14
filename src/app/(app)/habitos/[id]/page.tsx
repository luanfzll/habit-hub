import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { HabitDetail } from "@/components/habit/habit-detail";
import { getHabitView, HabitNotFoundError } from "@/server/habits/service";
import { getUsername } from "@/server/public/service";
import { requestOrigin } from "@/server/request-origin";
import { requireUser, userToday } from "@/server/session";

export const metadata: Metadata = { title: "Hábito · HabitHub" };

export default function HabitPage({ params }: PageProps<"/habitos/[id]">) {
  const t = useTranslations("habitPage");
  return (
    <>
      <Link href="/painel" className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {t("back")}
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
        <Habit params={params} />
      </Suspense>
    </>
  );
}

async function Habit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const [habit, username, origin] = await Promise.all([
    getHabitView(user.id, id).catch((error) => {
      if (error instanceof HabitNotFoundError) notFound();
      throw error;
    }),
    getUsername(user.id),
    requestOrigin(),
  ]);
  return <HabitDetail habit={habit} today={userToday(user)} username={username} origin={origin} />;
}
