export type HabitFormError = "invalid" | "limitReached";

export interface HabitFormState {
  error?: HabitFormError;
}
