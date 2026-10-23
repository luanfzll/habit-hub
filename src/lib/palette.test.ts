import { describe, expect, it } from "vitest";
import { contrast, HABIT_COLORS, habitPalette } from "./palette";

describe("habit palette", () => {
  it.each(HABIT_COLORS)("keeps the streak number on %s readable in both themes", (color) => {
    for (const theme of ["light", "dark"] as const) {
      const { base, text } = habitPalette(color, theme);
      // The streak number is large bold text: WCAG asks for at least 3:1; we aim for 4.5:1.
      expect(contrast(base, text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(HABIT_COLORS)("keeps %s text readable on its light wash in both themes", (color) => {
    for (const theme of ["light", "dark"] as const) {
      const { wash, ink } = habitPalette(color, theme);
      // Selected weekdays in the habit form: normal-size text, so 4.5:1.
      expect(contrast(ink, wash)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("goes from a pale tint to the full color", () => {
    const { base, tones } = habitPalette("blue", "light");
    expect(tones).toHaveLength(4);
    expect(tones[3]).toBe(base);
    expect(contrast(tones[0], "#d3d9d7")).toBeLessThan(contrast(tones[3], "#d3d9d7"));
  });
});
