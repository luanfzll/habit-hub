"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { CalendarDate } from "@/domain/calendar-date";
import type { DayState } from "@/domain/day-state";
import type { GridLayout } from "@/domain/grid";
import { formatMonthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cellLabel } from "./cell-label";

interface HabitGridProps {
  layout: GridLayout;
  name: string;
  unit: string | null;
  /** Cell that receives focus first when tabbing into the grid. */
  initialFocus: CalendarDate;
  /** Without it the grid is read-only (public profile): each square is an image with its description. */
  onSelectDay?: (day: DayState, anchor: HTMLButtonElement) => void;
  /**
   * "clip" (dashboard): on narrow screens the oldest weeks are cut off.
   * "scroll" (habit page): the whole year scrolls sideways, starting at today.
   */
  overflow?: "clip" | "scroll";
  /** Day whose square should play the "registered" pop once. */
  popDate?: CalendarDate | null;
  onPopEnd?: () => void;
}

const ROWS = 7;
/** Weekday labels column (24px) plus the gap after it (6px). */
const LABELS_WIDTH = 30;
/** Inner padding so today's outline and the focus ring are not clipped at the edges. */
const OUTLINE_ROOM = 4;

function isInteractive(day: DayState): boolean {
  return day.kind !== "before-start" && day.kind !== "future";
}

/**
 * GitHub-style grid. The whole grid is a single Tab stop; arrow keys move between
 * days and Enter (or a click) opens the day menu.
 */
export function HabitGrid({
  layout,
  name,
  unit,
  initialFocus,
  onSelectDay,
  overflow = "clip",
  popDate = null,
  onPopEnd,
}: HabitGridProps) {
  const t = useTranslations("grid");
  const [focusDate, setFocusDate] = useState(initialFocus);
  const buttons = useRef(new Map<CalendarDate, HTMLButtonElement>());
  const { columns, months } = layout;

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();

    let column = columns.findIndex((days) => days.some((day) => day?.date === focusDate));
    let row = column === -1 ? -1 : columns[column].findIndex((day) => day?.date === focusDate);
    if (column === -1) return;

    // Walk in the pressed direction until an interactive day is found.
    while (true) {
      column += step[0];
      row += step[1];
      if (row < 0 || row >= ROWS) {
        if (step[1] === 0) return;
        column += step[1];
        row = (row + ROWS) % ROWS;
      }
      if (column < 0 || column >= columns.length) return;
      const day = columns[column][row];
      if (day && isInteractive(day)) {
        setFocusDate(day.date);
        buttons.current.get(day.date)?.focus();
        return;
      }
    }
  }

  return (
    // Cells grow to fill the card on wide screens (up to 16px) and stop shrinking at a minimum
    // size; below that the oldest weeks are cut off or scroll, depending on `overflow`.
    <div className="@container">
      <div
        className="flex gap-1.5 text-[10px] leading-none text-muted-foreground"
        style={
          {
            "--cell-size": `clamp(${overflow === "scroll" ? 12 : 10}px, calc((100cqi - ${LABELS_WIDTH + OUTLINE_ROOM * 2}px - ${columns.length - 1} * var(--cell-gap)) / ${columns.length}), 16px)`,
          } as CSSProperties
        }
      >
        <div
          aria-hidden
          className="grid w-6 shrink-0"
          style={{
            paddingTop: OUTLINE_ROOM,
            gridTemplateRows: `calc(var(--cell-size) + 4px) repeat(${ROWS}, var(--cell-size))`,
            rowGap: "var(--cell-gap)",
          }}
        >
          <span />
          {Array.from({ length: ROWS }, (_, row) => (
            <span key={row} className="flex items-center">
              {row % 2 === 1 ? t("weekdayShort", { day: String(row) }) : ""}
            </span>
          ))}
        </div>

        {/* Right-aligned so today stays visible; row-reverse makes scrolling start at the right end. */}
        <div
          className={
            overflow === "scroll"
              ? "flex min-w-0 flex-1 flex-row-reverse overflow-x-auto pb-2"
              : // 716px = labels + 53 columns at the 10px minimum; below it the cut edge fades out.
                "flex min-w-0 flex-1 justify-end overflow-hidden @max-[716px]:[mask-image:linear-gradient(to_right,transparent,black_1.5rem)]"
          }
        >
          <div style={{ padding: OUTLINE_ROOM }}>
            <div
              aria-hidden
              className="mb-1 grid"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, var(--cell-size))`,
                columnGap: "var(--cell-gap)",
                height: "var(--cell-size)",
              }}
            >
              {months.map((label) => (
                <span key={label.column} className="whitespace-nowrap" style={{ gridColumnStart: label.column + 1 }}>
                  {formatMonthLabel(label.month)}
                </span>
              ))}
            </div>

            <div
              role="group"
              aria-label={t("label", { name })}
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(${ROWS}, var(--cell-size))`,
                gridAutoColumns: "var(--cell-size)",
                gap: "var(--cell-gap)",
              }}
              onKeyDown={onSelectDay && moveFocus}
            >
              {columns.flatMap((days, column) =>
                days.map((day, row) => {
                  const key = `${column}-${row}`;
                  if (!day) return <span key={key} aria-hidden />;
                  if (!isInteractive(day)) {
                    return <span key={key} aria-hidden className="habit-cell" data-kind={day.kind} />;
                  }
                  if (!onSelectDay) {
                    const label = cellLabel(t, day, unit);
                    return (
                      <span
                        key={key}
                        role="img"
                        className="habit-cell"
                        data-kind={day.kind}
                        data-level={day.level}
                        data-today={day.isToday}
                        aria-label={label}
                        title={label}
                      />
                    );
                  }
                  return (
                    <button
                      key={key}
                      ref={(element) => {
                        if (element) buttons.current.set(day.date, element);
                        else buttons.current.delete(day.date);
                      }}
                      type="button"
                      className="habit-cell"
                      data-kind={day.kind}
                      data-level={day.level}
                      data-today={day.isToday}
                      data-pop={day.date === popDate}
                      onAnimationEnd={onPopEnd}
                      tabIndex={day.date === focusDate ? 0 : -1}
                      aria-label={cellLabel(t, day, unit)}
                      onFocus={() => setFocusDate(day.date)}
                      onClick={(event) => onSelectDay(day, event.currentTarget)}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Legend in the habit's own tones. "Not scheduled" and "skipped" only appear when
 * the habit actually has such days, to keep the cards quiet.
 */
export function GridLegend({
  showOffSchedule = true,
  showSkipped = true,
  className,
}: {
  showOffSchedule?: boolean;
  showSkipped?: boolean;
  className?: string;
}) {
  const t = useTranslations("grid");
  return (
    <div
      aria-hidden
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}
    >
      <span className="flex items-center gap-1">
        {t("less")}
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="habit-cell" data-level={level} />
        ))}
        {t("more")}
      </span>
      {showOffSchedule && (
        <span className="flex items-center gap-1.5">
          <span className="habit-cell" data-kind="off-schedule" />
          {t("offSchedule")}
        </span>
      )}
      {showSkipped && (
        <span className="flex items-center gap-1.5">
          <span className="habit-cell" data-kind="skipped" />
          {t("skipped")}
        </span>
      )}
    </div>
  );
}
