import type { HabitColor } from "@/generated/prisma/enums";

/**
 * Four tones per habit color (level 1 to 4), for light and dark themes.
 * Kept in TypeScript so the app and the README image share the same values.
 */
export const PALETTE: Record<HabitColor, { light: readonly string[]; dark: readonly string[] }> = {
  green: {
    light: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
    dark: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  blue: {
    light: ["#bfdbfe", "#60a5fa", "#2563eb", "#1e40af"],
    dark: ["#1e3a8a", "#1d4ed8", "#3b82f6", "#93c5fd"],
  },
  purple: {
    light: ["#ddd6fe", "#a78bfa", "#7c3aed", "#5b21b6"],
    dark: ["#4c1d95", "#6d28d9", "#8b5cf6", "#c4b5fd"],
  },
  pink: {
    light: ["#fbcfe8", "#f472b6", "#db2777", "#9d174d"],
    dark: ["#831843", "#be185d", "#ec4899", "#f9a8d4"],
  },
  red: {
    light: ["#fecaca", "#f87171", "#dc2626", "#991b1b"],
    dark: ["#7f1d1d", "#b91c1c", "#ef4444", "#fca5a5"],
  },
  orange: {
    light: ["#fed7aa", "#fb923c", "#ea580c", "#9a3412"],
    dark: ["#7c2d12", "#c2410c", "#f97316", "#fdba74"],
  },
  yellow: {
    light: ["#fde68a", "#fbbf24", "#d97706", "#92400e"],
    dark: ["#78350f", "#b45309", "#f59e0b", "#fcd34d"],
  },
  teal: {
    light: ["#99f6e4", "#2dd4bf", "#0d9488", "#115e59"],
    dark: ["#134e4a", "#0f766e", "#14b8a6", "#5eead4"],
  },
};

/** CSS variables consumed by the `.habit-cell` styles in globals.css. */
export function paletteVariables(color: HabitColor): Record<string, string> {
  const { light, dark } = PALETTE[color];
  return Object.fromEntries([
    ...light.map((value, i) => [`--habit-light-${i + 1}`, value]),
    ...dark.map((value, i) => [`--habit-dark-${i + 1}`, value]),
  ]);
}
