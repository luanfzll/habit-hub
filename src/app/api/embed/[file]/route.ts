import { getTranslations } from "next-intl/server";
import { todayIn } from "@/domain/calendar-date";
import { computeStats } from "@/domain/day-state";
import { gridStart } from "@/domain/grid";
import { LOCALE } from "@/i18n/request";
import { renderEmbedSvg, renderUnavailableSvg, type EmbedTheme } from "@/lib/embed-svg";
import { getEmbedHabit } from "@/server/public/service";

const PUBLIC_ID = /^[a-z0-9]{10}$/;

/**
 * README image of a public habit: /api/embed/<publicId>.svg?theme=light|dark.
 * Cached for an hour by Vercel and by GitHub's image proxy (stale copies are served
 * while a fresh one is drawn), which also keeps the database from waking up for
 * every view. Unavailable habits get a placeholder cached for five minutes.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/embed/[file]">) {
  const { file } = await params;
  const theme: EmbedTheme = new URL(request.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  const t = await getTranslations({ locale: LOCALE });
  const publicId = file.endsWith(".svg") ? file.slice(0, -4) : "";
  const found = PUBLIC_ID.test(publicId) ? await getEmbedHabit(publicId) : null;

  if (!found) {
    return svgResponse(renderUnavailableSvg(theme, t("embed.unavailable")), "public, max-age=300, s-maxage=300");
  }

  const { habit, timezone } = found;
  const today = todayIn(timezone);
  const history = {
    startDate: habit.startDate,
    versions: habit.versions,
    entries: new Map(habit.entries.map(({ date, value, skipped }) => [date, { value, skipped }])),
  };
  const { currentStreak } = computeStats(history, today, gridStart({ today }));
  const svg = renderEmbedSvg({
    name: habit.name,
    color: habit.color,
    history,
    today,
    theme,
    streakText: t("embed.streak", { count: currentStreak }),
    weekdayLabels: [0, 1, 2, 3, 4, 5, 6].map((day) => t("grid.weekdayShort", { day: String(day) })),
  });
  return svgResponse(svg, "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
}

function svgResponse(svg: string, cacheControl: string) {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
      // Opened directly, the SVG can run nothing: no scripts, no external loads.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
