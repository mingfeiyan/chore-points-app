type PointEntry = {
  id: string;
  points: number;
  date: string;
};

/**
 * Get local date string (YYYY-MM-DD) from a date
 * Uses local timezone to avoid UTC conversion issues
 */
export function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Group entries by date (YYYY-MM-DD)
 */
export function groupEntriesByDate(
  entries: PointEntry[]
): Map<string, PointEntry[]> {
  const grouped = new Map<string, PointEntry[]>();

  for (const entry of entries) {
    const key = toDateKey(entry.date);
    const existing = grouped.get(key) || [];
    existing.push(entry);
    grouped.set(key, existing);
  }

  return grouped;
}

/**
 * Calculate daily point totals
 */
export function getDailyTotals(entries: PointEntry[]): Map<string, number> {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = toDateKey(entry.date);
    const existing = totals.get(key) || 0;
    totals.set(key, existing + entry.points);
  }

  return totals;
}

/**
 * Get indicator for a day based on points earned
 */
export function getDayIndicator(
  points: number
): "fire" | "star" | "none" {
  if (points > 10) return "fire";
  if (points >= 1) return "star";
  return "none";
}

/**
 * Get all days in a month as an array of Date objects
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return days;
}

/**
 * Get the day of week for the first day of a month (0 = Sunday)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
