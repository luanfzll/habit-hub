import { ImageResponse } from "next/og";
import { habitPalette } from "@/lib/palette";

// The same picture for every page, public profiles included: a preview drawn from
// the person's grid is planned for later. Generated once, at build time.
export const alt = "HabitHub: seus hábitos numa grade, um quadradinho por dia.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLUMNS = 32;
const CELL = 26;
const GAP = 7;
const MARK_COLORS = ["#14b86e", "#2f6bff", "#ff7a1c", "#ff4fa0"];

/** Fixed pseudo-random levels, denser towards today, so the image never changes between builds. */
function level(column: number, row: number): number {
  const noise = (column * 37 + row * 91 + column * row * 13) % 17;
  const streak = column / COLUMNS;
  return Math.max(0, Math.min(4, Math.round(noise / 5 + streak * 2.4 - 1)));
}

export default function OpengraphImage() {
  const { tones } = habitPalette("green", "dark");
  const fills = ["#383e44", ...tones];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0f1113",
        color: "#f4f6f5",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", width: 84, gap: 6 }}>
          {MARK_COLORS.map((color) => (
            <div key={color} style={{ width: 39, height: 39, borderRadius: 9, background: color }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>habithub</div>
          <div style={{ fontSize: 32, color: "#9aa1aa" }}>Seus hábitos numa grade, um quadradinho por dia.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: GAP }}>
        {Array.from({ length: COLUMNS }, (_, column) => (
          <div key={column} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
            {Array.from({ length: 7 }, (_, row) => (
              <div
                key={row}
                style={{ width: CELL, height: CELL, borderRadius: 6, background: fills[level(column, row)] }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
