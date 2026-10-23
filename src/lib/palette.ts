import type { HabitColor } from "@/generated/prisma/enums";

type Theme = "light" | "dark";

/** Full-strength color of each habit, per theme (brighter on dark backgrounds). */
const BASE: Record<HabitColor, Record<Theme, string>> = {
  green: { light: "#14b86e", dark: "#2bd585" },
  blue: { light: "#2f6bff", dark: "#5c8dff" },
  purple: { light: "#7b4dff", dark: "#9b7aff" },
  pink: { light: "#ff4fa0", dark: "#ff6fb3" },
  red: { light: "#f2463a", dark: "#ff6a5e" },
  orange: { light: "#ff7a1c", dark: "#ff9447" },
  yellow: { light: "#f5b700", dark: "#ffc93d" },
  teal: { light: "#0eb3a9", dark: "#2ed3c8" },
};

/** Empty grid square; the four tones blend from it to the habit color. Mirrors --cell-empty in globals.css. */
const EMPTY: Record<Theme, string> = { light: "#d3d9d7", dark: "#383e44" };
const TONE_STRENGTH = [0.28, 0.52, 0.76, 1];

/** Page background, where forms sit. Mirrors --background in globals.css. */
const BACKGROUND: Record<Theme, string> = { light: "#f1f3f2", dark: "#0f1113" };
/** How much of the habit color goes into the light wash behind selected options. */
const WASH_STRENGTH = 0.16;
/** WCAG AA for normal text. */
const READABLE = 4.5;

export const HABIT_COLORS = Object.keys(BASE) as HabitColor[];

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function mix(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever reads better on the habit color. */
export function textOn(background: string): string {
  return contrast(background, "#000000") >= contrast(background, "#ffffff") ? "#000000" : "#ffffff";
}

/**
 * The habit color as text on `background`: darkened (light theme) or lightened (dark
 * theme) just enough to read at 4.5:1. Several colors, yellow above all, are too light
 * to be text on a light background as they are.
 */
function inkOn(background: string, base: string, theme: Theme): string {
  const towards = theme === "light" ? "#000000" : "#ffffff";
  for (let amount = 0; amount <= 1; amount += 0.02) {
    const ink = mix(base, towards, amount);
    if (contrast(ink, background) >= READABLE) return ink;
  }
  return towards;
}

export interface HabitPalette {
  base: string;
  /** Tones for levels 1 to 4. */
  tones: string[];
  /** Text color used on top of `base`. */
  text: string;
  /** Light wash of the color over the page background, behind selected options. */
  wash: string;
  /** The color as readable text on `wash` (and on the page background). */
  ink: string;
}

export function habitPalette(color: HabitColor, theme: Theme): HabitPalette {
  const base = BASE[color][theme];
  const wash = mix(BACKGROUND[theme], base, WASH_STRENGTH);
  return {
    base,
    tones: TONE_STRENGTH.map((strength) => mix(EMPTY[theme], base, strength)),
    text: textOn(base),
    wash,
    ink: inkOn(wash, base, theme),
  };
}

/** CSS variables consumed by globals.css (grid tones, streak tile, buttons and options in the habit color). */
export function paletteVariables(color: HabitColor): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const theme of ["light", "dark"] as const) {
    const { base, tones, text, wash, ink } = habitPalette(color, theme);
    variables[`--habit-${theme}`] = base;
    variables[`--habit-${theme}-text`] = text;
    variables[`--habit-${theme}-wash`] = wash;
    variables[`--habit-${theme}-ink`] = ink;
    tones.forEach((tone, i) => (variables[`--habit-${theme}-${i + 1}`] = tone));
  }
  return variables;
}
