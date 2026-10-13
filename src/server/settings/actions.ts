"use server";

import { refresh } from "next/cache";
import { isValidTimeZone } from "@/domain/calendar-date";
import { db } from "../db";
import { getCurrentUser } from "../session";

/** Changing the time zone never moves registered days: they are stored as calendar dates. */
export async function updateTimezoneAction(timezone: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || typeof timezone !== "string" || !isValidTimeZone(timezone)) return { ok: false };

  await db.user.update({ where: { id: user.id }, data: { timezone } });
  refresh();
  return { ok: true };
}
