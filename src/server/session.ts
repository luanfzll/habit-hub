import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { todayIn, type CalendarDate } from "@/domain/calendar-date";
import { auth } from "./auth";

export interface CurrentUser {
  id: string;
  email: string;
  timezone: string;
}

/** Reads the session once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, email, timezone } = session.user;
  return { id, email, timezone };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** "Today" always comes from the time zone saved in the profile, never from the browser. */
export function userToday(user: CurrentUser): CalendarDate {
  return todayIn(user.timezone);
}
