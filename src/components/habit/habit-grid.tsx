"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { CalendarDate } from "@/domain/calendar-date";
import type { DayState } from "@/domain/day-state";
import type { GridLayout } from "@/domain/grid";
import { formatMonthLabel } from "@/lib/format";
import { cellLabel } from "./cell-label";

interface HabitGridProps {
  layout: GridLayout;
  name: string;
  unit: string | null;
  /** Cell that receives focus first when tabbing into the grid. */
  initialFocus: CalendarDate;
  onSelectDay: (day: DayState, anchor: HTMLButtonElement) => void;
}

const ROWS = 7;
/** Weekday labels column (24px) plus the gap after it (6px). */
const LABELS_WIDTH = 30;

function isInteractive(day: DayState): boolean {
  return day.kind !== "before-start" && day.kind !== "future";
}

/**
 * GitHub-style grid. The whole grid is a single Tab stop; arrow keys move between
 * days and Enter (or a click) opens the day menu.
 */
export function HabitGrid({ layout, name, unit, initialFocus, onSelectDay }: HabitGridProps) {
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
    // Cells grow to fill the card on wide screens (up to 16px) and stop shrinking at 10px;
    // below that the oldest weeks are cut off instead.
    <div className="@container">
      <div
        className="flex gap-1.5 text-[10px] leading-none text-muted-foreground"
        style={
          {
            "--cell-size": `clamp(10px, calc((100cqi - ${LABELS_WIDTH}px - ${columns.length - 1} * var(--cell-gap)) / ${columns.length}), 16px)`,
          } as CSSProperties
        }
      >
        <div
          aria-hidden
          className="grid w-6 shrink-0"
          style={{
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

        {/* On narrow screens the oldest weeks are cut off on the left. */}
        <div className="flex min-w-0 flex-1 justify-end overflow-hidden">
          <div>
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
              onKeyDown={moveFocus}
            >
              {columns.flatMap((days, column) =>
                days.map((day, row) => {
                  const key = `${column}-${row}`;
                  if (!day) return <span key={key} aria-hidden />;
                  if (!isInteractive(day)) {
                    return <span key={key} aria-hidden className="habit-cell" data-kind={day.kind} />;
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

export function GridLegend() {
  const t = useTranslations("grid");
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        {t("less")}
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="habit-cell" data-level={level} />
        ))}
        {t("more")}
      </span>
      <span className="flex items-center gap-1">
        <span className="habit-cell" data-kind="off-schedule" />
        {t("offSchedule")}
      </span>
      <span className="flex items-center gap-1">
        <span className="habit-cell" data-kind="skipped" />
        {t("skipped")}
      </span>
    </div>
  );
}
