import { addDays, dayOfMonth, monthOf, startOfWeek, type CalendarDate, type Weekday } from "./calendar-date";
import { evaluateDays, type DayState, type HabitHistory } from "./day-state";

export const DEFAULT_WEEKS = 53;

export interface GridOptions {
  today: CalendarDate;
  /** Number of week columns, the last one containing today. */
  weeks?: number;
  weekStartsOn?: Weekday;
}

export interface MonthLabel {
  /** Column where the label starts. */
  column: number;
  /** 1-12 */
  month: number;
}

export interface GridLayout {
  /** First day shown (top of the first column). */
  start: CalendarDate;
  /** Columns of 7 rows. Days after today are null and are not drawn. */
  columns: (DayState | null)[][];
  months: MonthLabel[];
}

/** First day covered by a grid ending on `today`. */
export function gridStart({ today, weeks = DEFAULT_WEEKS, weekStartsOn = 0 }: GridOptions): CalendarDate {
  return addDays(startOfWeek(today, weekStartsOn), -(weeks - 1) * 7);
}

/**
 * Lays out a habit as a GitHub-style grid. The same layout feeds the HTML grid
 * in the app and the SVG image for READMEs, so both always agree.
 */
export function buildGrid(history: HabitHistory, options: GridOptions): GridLayout {
  const { today, weeks = DEFAULT_WEEKS } = options;
  const start = gridStart(options);
  const lastShown = addDays(start, weeks * 7 - 1);
  const days = evaluateDays(history, start, lastShown, today);

  const columns: (DayState | null)[][] = [];
  for (let column = 0; column < weeks; column++) {
    columns.push(days.slice(column * 7, column * 7 + 7).map((day) => (day.kind === "future" ? null : day)));
  }

  return { start, columns, months: monthLabels(start, weeks) };
}

/**
 * A label goes on the first column that contains the 1st of a month. A label
 * for the partial first month is only kept if it has room before the next one.
 */
function monthLabels(start: CalendarDate, weeks: number): MonthLabel[] {
  const labels: MonthLabel[] = [];
  for (let column = 0; column < weeks; column++) {
    const top = addDays(start, column * 7);
    const firstOfMonthInColumn = Array.from({ length: 7 }, (_, row) => addDays(top, row)).find(
      (date) => dayOfMonth(date) === 1,
    );
    if (firstOfMonthInColumn) {
      labels.push({ column, month: monthOf(firstOfMonthInColumn) });
    }
  }

  const MIN_COLUMNS_BETWEEN_LABELS = 3;
  if (labels.length === 0 || labels[0].column >= MIN_COLUMNS_BETWEEN_LABELS) {
    labels.unshift({ column: 0, month: monthOf(start) });
  }
  return labels;
}
