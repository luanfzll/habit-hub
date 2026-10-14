import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY } from "@/domain/habit-config";
import { escapeXml, renderEmbedSvg, renderUnavailableSvg } from "./embed-svg";
import { habitPalette } from "./palette";

const d = parseCalendarDate;
const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function render(name = "Ler", theme: "light" | "dark" = "light") {
  return renderEmbedSvg({
    name,
    color: "green",
    theme,
    today: d("2026-10-14"),
    streakText: "2 dias seguidos",
    weekdayLabels,
    history: {
      startDate: d("2026-10-01"),
      versions: [{ effectiveFrom: d("2026-10-01"), target: 1, weekdays: EVERY_DAY }],
      entries: new Map([
        [d("2026-10-12"), { value: 1, skipped: false }],
        [d("2026-10-13"), { value: 1, skipped: false }],
      ]),
    },
  });
}

describe("README image", () => {
  it("draws one square per day up to today, none for the rest of the week", () => {
    // 53 weeks starting on a Sunday; today is a Wednesday, so 3 days of the last week are missing.
    expect(render().match(/<rect x="\d+(\.\d+)?" y="\d+(\.\d+)?" width="10"/g)).toHaveLength(53 * 7 - 3);
  });

  it("uses the habit's tones for the chosen theme", () => {
    const fullTone = habitPalette("green", "dark").tones[3];
    expect(render("Ler", "dark")).toContain(`fill="${fullTone}"`);
    expect(render("Ler", "light")).not.toContain(`fill="${fullTone}"`);
  });

  it("shows the name and the streak, escaped", () => {
    const svg = render(`Ler <script>&"`);
    expect(svg).toContain("Ler &#60;script&#62;&#38;&#34;");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("2 dias seguidos");
  });

  it("has a placeholder for habits that are not available", () => {
    expect(renderUnavailableSvg("dark", "Hábito indisponível")).toContain("Hábito indisponível");
  });

  it("escapes every XML special character", () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe("&#60;a href=&#34;x&#34;&#62;&#39;&#38;&#39;&#60;/a&#62;");
  });
});
