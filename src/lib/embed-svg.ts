import type { CalendarDate } from "@/domain/calendar-date";
import type { DayState, HabitHistory } from "@/domain/day-state";
import { buildGrid } from "@/domain/grid";
import type { HabitColor } from "@/generated/prisma/enums";
import { formatMonthLabel } from "./format";
import { habitPalette } from "./palette";

/**
 * The README image: the same grid as the app (same layout function, same tones),
 * drawn as a standalone SVG. Images in a README cannot load fonts or scripts, so
 * it uses the system font stack and has a transparent background that sits on
 * GitHub's light or dark page.
 */

export type EmbedTheme = "light" | "dark";

const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const PADDING = 16;
const LABELS_WIDTH = 28;
const HEADER_HEIGHT = 28;
const MONTHS_HEIGHT = 16;
const FOOTER_HEIGHT = 18;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const INK: Record<EmbedTheme, { text: string; muted: string; empty: string; line: string }> = {
  light: { text: "#1f2328", muted: "#59636e", empty: "#d3d9d7", line: "#a9b1af" },
  dark: { text: "#e6edf3", muted: "#9198a1", empty: "#383e44", line: "#59616a" },
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export interface EmbedInput {
  name: string;
  color: HabitColor;
  history: HabitHistory;
  today: CalendarDate;
  theme: EmbedTheme;
  /** Already translated: "12 dias seguidos". */
  streakText: string;
  /** Already translated weekday labels, indexed 0 (Sunday) to 6. */
  weekdayLabels: string[];
}

function cell(day: DayState, x: number, y: number, tones: string[], ink: (typeof INK)[EmbedTheme]): string {
  const base = `x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2"`;
  switch (day.kind) {
    case "before-start":
      return `<rect ${base} fill="none" stroke="${ink.empty}"/>`;
    case "off-schedule":
      return `<rect ${base} fill="url(#hatch)"/>`;
    case "skipped":
      return `<rect ${base} fill="${ink.empty}"/><rect x="${x + 2.5}" y="${y + 4.5}" width="5" height="1" fill="${ink.line}"/>`;
    default: {
      const fill = day.level === 0 ? ink.empty : tones[day.level - 1];
      const today = day.isToday ? ` stroke="${ink.text}" stroke-width="1"` : "";
      return `<rect ${base} fill="${fill}"${today}/>`;
    }
  }
}

export function renderEmbedSvg({ name, color, history, today, theme, streakText, weekdayLabels }: EmbedInput): string {
  const ink = INK[theme];
  const { tones } = habitPalette(color, theme);
  const { columns, months } = buildGrid(history, { today });

  const gridLeft = PADDING + LABELS_WIDTH;
  const gridTop = PADDING + HEADER_HEIGHT + MONTHS_HEIGHT;
  const width = gridLeft + columns.length * STEP - GAP + PADDING;
  const height = gridTop + 7 * STEP - GAP + FOOTER_HEIGHT + PADDING;

  const cells = columns
    .flatMap((days, column) =>
      days.map((day, row) => (day ? cell(day, gridLeft + column * STEP, gridTop + row * STEP, tones, ink) : "")),
    )
    .join("");

  const monthLabels = months
    .map(
      (label) =>
        `<text x="${gridLeft + label.column * STEP}" y="${gridTop - 6}">${escapeXml(formatMonthLabel(label.month))}</text>`,
    )
    .join("");

  const weekdays = [1, 3, 5]
    .map((row) => `<text x="${PADDING}" y="${gridTop + row * STEP + CELL - 1}">${escapeXml(weekdayLabels[row])}</text>`)
    .join("");

  const title = escapeXml(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}: ${escapeXml(streakText)}">
<title>${title}: ${escapeXml(streakText)}</title>
<defs><pattern id="hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="${ink.empty}"/><rect width="1" height="3" fill="${ink.line}"/></pattern></defs>
<g font-family="${FONT}">
<text x="${PADDING}" y="${PADDING + 15}" font-size="15" font-weight="600" fill="${ink.text}">${title}</text>
<text x="${width - PADDING}" y="${PADDING + 15}" font-size="13" text-anchor="end" fill="${tones[3]}" font-weight="600">${escapeXml(streakText)}</text>
<g font-size="10" fill="${ink.muted}">${monthLabels}${weekdays}</g>
${cells}
<text x="${width - PADDING}" y="${height - PADDING + 2}" font-size="10" text-anchor="end" fill="${ink.muted}">habithub</text>
</g>
</svg>`;
}

/** Shown for habits that are private, archived, deleted or unknown, so READMEs never show a broken image. */
export function renderUnavailableSvg(theme: EmbedTheme, message: string): string {
  const ink = INK[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="56" viewBox="0 0 320 56" role="img" aria-label="${escapeXml(message)}">
<title>${escapeXml(message)}</title>
<rect x="0.5" y="0.5" width="319" height="55" rx="10" fill="none" stroke="${ink.empty}"/>
<text x="160" y="33" font-family="${FONT}" font-size="13" text-anchor="middle" fill="${ink.muted}">${escapeXml(message)}</text>
</svg>`;
}
