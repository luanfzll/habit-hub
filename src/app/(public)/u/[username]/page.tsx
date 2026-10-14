import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicHabitCard } from "@/components/habit/public-habit-card";
import { todayIn } from "@/domain/calendar-date";
import { normalizeUsername, usernameProblem } from "@/domain/username";
import { getPublicProfile } from "@/server/public/service";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const username = normalizeUsername((await params).username);
  return {
    title: usernameProblem(username) === "format" ? "HabitHub" : `${username} · HabitHub`,
    // Nobody expects their habits to show up on Google.
    robots: { index: false, follow: false },
  };
}

export default function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/40 motion-reduce:animate-none" />}>
      <Profile params={params} />
    </Suspense>
  );
}

/** Only the username and the public habits. Unknown users and users without public habits look the same. */
async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const profile = await getPublicProfile((await params).username);
  if (!profile) notFound();
  const t = await getTranslations("profile");
  const today = todayIn(profile.timezone);

  return (
    <>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight break-words sm:text-[1.75rem]">
          {profile.username}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle", { count: profile.habits.length })}</p>
      </header>
      {profile.habits.map((habit) => (
        <PublicHabitCard key={habit.id} habit={habit} today={today} />
      ))}
    </>
  );
}
