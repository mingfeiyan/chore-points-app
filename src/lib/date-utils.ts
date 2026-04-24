export const LOCAL_TZ =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

// Format a date/timestamp as YYYY-MM-DD in the browser's local timezone.
// Using toLocaleDateString("en-CA") avoids the UTC-slice bug where an
// evening-local timestamp would bucket onto the next UTC day.
export function toLocalDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-CA", { timeZone: LOCAL_TZ });
}

export interface MonthCell {
  day: number;
  inMonth: boolean;
  dateStr: string;
}

export function buildMonthCells(year: number, month: number): MonthCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: MonthCell[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({
      day: d,
      inMonth: false,
      dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      inMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  while (cells.length < 42) {
    const d = cells.length - firstDay - daysInMonth + 1;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({
      day: d,
      inMonth: false,
      dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }
  if (cells.slice(35).every((c) => !c.inMonth)) return cells.slice(0, 35);
  return cells;
}
