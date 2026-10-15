"use client";

import { useSyncExternalStore } from "react";
import { todayIn, type CalendarDate } from "@/domain/calendar-date";

const browserToday = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

/**
 * The visitor's "today", for the home page examples. It only exists in the browser, so
 * the server (and the static page) get null and render a placeholder instead.
 */
export function useBrowserToday(): CalendarDate | null {
  return useSyncExternalStore(
    () => () => {},
    browserToday,
    () => null,
  );
}
