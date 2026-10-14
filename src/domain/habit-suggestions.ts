import type { HabitColor } from "@/generated/prisma/enums";
import { EVERY_DAY, weekdaysFromList } from "./habit-config";

/**
 * Suggestions offered on the empty dashboard. They fill the new-habit form, showing
 * at once that a habit can have a numeric target and chosen weekdays. Names and
 * units are in the messages file (suggestions.<key>).
 */
export const HABIT_SUGGESTIONS = {
  ler: { color: "green", target: 10, weekdays: EVERY_DAY, hasUnit: true },
  agua: { color: "blue", target: 8, weekdays: EVERY_DAY, hasUnit: true },
  exercicio: { color: "orange", target: 1, weekdays: weekdaysFromList([1, 3, 5]), hasUnit: false },
} as const satisfies Record<string, { color: HabitColor; target: number; weekdays: number; hasUnit: boolean }>;

export type HabitSuggestion = keyof typeof HABIT_SUGGESTIONS;

export function isHabitSuggestion(value: unknown): value is HabitSuggestion {
  return typeof value === "string" && Object.hasOwn(HABIT_SUGGESTIONS, value);
}
