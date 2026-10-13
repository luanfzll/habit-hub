import { z } from "zod";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar-date";
import { MAX_TARGET, MAX_VALUE, MIN_TARGET } from "@/domain/habit-config";
import { HabitColor } from "@/generated/prisma/enums";

export const HABIT_COLORS = Object.values(HabitColor);

export const habitInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(HabitColor),
  unit: z
    .string()
    .trim()
    .max(15)
    .transform((unit) => unit || null)
    .nullable(),
  target: z.coerce.number().int().min(MIN_TARGET).max(MAX_TARGET),
  weekdays: z.coerce.number().int().min(1).max(127),
});

export type HabitInput = z.output<typeof habitInputSchema>;

export const calendarDateSchema = z
  .string()
  .refine(isCalendarDate)
  .transform((value) => value as CalendarDate);

export const entryChangeSchema = z.union([
  z.object({ value: z.number().int().min(0).max(MAX_VALUE) }),
  z.object({ skip: z.literal(true) }),
]);

export type EntryChange = z.output<typeof entryChangeSchema>;
