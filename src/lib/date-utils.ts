/**
 * Timezone-aware date utilities for PT (America/Los_Angeles).
 * Used by kiosk API, points API, and bonus logic.
 */

const TZ = "America/Los_Angeles";

/** Get start of today in PT timezone as UTC Date */
export function getTodayStartPT(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const localMidnight = new Date(`${p.year}-${p.month}-${p.day}T00:00:00`);
  const offsetMs =
    now.getTime() -
    new Date(
      now.toLocaleString("en-US", { timeZone: TZ })
    ).getTime();
  return new Date(localMidnight.getTime() + offsetMs);
}

/** Get start of this week (Monday) in PT timezone as UTC Date */
export function getWeekStartPT(): Date {
  const now = new Date();
  const ptNow = new Date(
    now.toLocaleString("en-US", { timeZone: TZ })
  );
  const day = ptNow.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayPT = new Date(ptNow);
  mondayPT.setDate(ptNow.getDate() + diffToMonday);
  mondayPT.setHours(0, 0, 0, 0);
  const offsetMs = now.getTime() - ptNow.getTime();
  return new Date(mondayPT.getTime() + offsetMs);
}

/** Get the period start for a given schedule type */
export function getPeriodStartPT(schedule: string): Date {
  return schedule === "weekly" ? getWeekStartPT() : getTodayStartPT();
}

/** Schedule labels in Chinese */
export const SCHEDULE_LABELS: Record<string, string> = {
  morning: "早上",
  evening: "晚上",
  weekly: "每周",
};

/** Schedule emoji for bonus notes */
export const SCHEDULE_EMOJI: Record<string, string> = {
  morning: "🌅",
  evening: "🌙",
  weekly: "📅",
};

/** Build the bonus note string for a schedule */
export function buildBonusNote(schedule: string): string {
  const base = getBaseSchedule(schedule);
  const emoji = SCHEDULE_EMOJI[base] || "🌟";
  const label = SCHEDULE_LABELS[base] || base;
  return `${emoji} ${label}全勤奖！🌟`;
}

/**
 * Get the base schedule group (strips modifiers like _weekday).
 * "morning_weekday" → "morning", "evening" → "evening"
 */
export function getBaseSchedule(schedule: string): string {
  return schedule.replace(/_weekday$/, "");
}

/**
 * Get today's date string in PT timezone as "YYYY-MM-DD".
 */
export function getTodayStringPT(): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
}

/**
 * Get today's date parts in PT timezone.
 */
function getTodayPartsPT(): { year: number; month: number; day: number; dayOfWeek: number } {
  const now = new Date();
  const ptNow = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  return {
    year: ptNow.getFullYear(),
    month: ptNow.getMonth() + 1, // 1-indexed
    day: ptNow.getDate(),
    dayOfWeek: ptNow.getDay(), // 0=Sun, 6=Sat
  };
}

/**
 * Check if today is a weekday in PT timezone.
 */
export function isWeekdayPT(): boolean {
  const { dayOfWeek } = getTodayPartsPT();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get the Nth weekday of a month (for floating holidays).
 * n=1 means first, n=-1 means last.
 */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  if (n > 0) {
    // First day of month
    const first = new Date(year, month - 1, 1);
    let day = 1 + ((weekday - first.getDay() + 7) % 7);
    day += (n - 1) * 7;
    return day;
  } else {
    // Last weekday of month
    const lastDay = new Date(year, month, 0).getDate();
    const last = new Date(year, month - 1, lastDay);
    let day = lastDay - ((last.getDay() - weekday + 7) % 7);
    day += (n + 1) * 7;
    return day;
  }
}

/**
 * Compute US federal holidays for a given year.
 * Returns set of "YYYY-MM-DD" strings.
 */
export function getUSFederalHolidays(year: number): Set<string> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (m: number, d: number) => `${year}-${pad(m)}-${pad(d)}`;
  const holidays = new Set<string>();

  // Fixed-date holidays
  holidays.add(fmt(1, 1));   // New Year's Day
  holidays.add(fmt(7, 4));   // Independence Day
  holidays.add(fmt(12, 25)); // Christmas Day

  // Floating holidays (month, weekday, nth)
  holidays.add(fmt(1, nthWeekdayOfMonth(year, 1, 1, 3)));   // MLK Day: 3rd Monday of Jan
  holidays.add(fmt(2, nthWeekdayOfMonth(year, 2, 1, 3)));   // Presidents' Day: 3rd Monday of Feb
  holidays.add(fmt(5, nthWeekdayOfMonth(year, 5, 1, -1)));  // Memorial Day: Last Monday of May
  holidays.add(fmt(9, nthWeekdayOfMonth(year, 9, 1, 1)));   // Labor Day: 1st Monday of Sep
  holidays.add(fmt(10, nthWeekdayOfMonth(year, 10, 1, 2)));  // Columbus Day: 2nd Monday of Oct
  holidays.add(fmt(11, 11));                                  // Veterans Day
  const thanksgivingDay = nthWeekdayOfMonth(year, 11, 4, 4); // Thanksgiving: 4th Thursday of Nov
  holidays.add(fmt(11, thanksgivingDay));
  holidays.add(fmt(11, thanksgivingDay + 1));                 // Black Friday (most schools off)

  return holidays;
}

/**
 * Check if today (in PT) is a US federal holiday.
 */
export function isUSHolidayPT(): boolean {
  const { year } = getTodayPartsPT();
  const todayStr = getTodayStringPT();
  return getUSFederalHolidays(year).has(todayStr);
}

/**
 * Check if today is a "school day" based on weekday + federal holidays.
 * Does NOT check custom off-days (those need DB lookup via isSchoolDay()).
 */
export function isSchoolDayBasic(): boolean {
  return isWeekdayPT() && !isUSHolidayPT();
}

/**
 * Check if a chore should be active today based on its schedule.
 * For full school-day checks (including custom off-days), use isChoreActiveTodayFull().
 * This version only checks weekday + federal holidays.
 */
export function isChoreActiveToday(schedule: string): boolean {
  if (schedule.endsWith("_weekday")) {
    return isSchoolDayBasic();
  }
  return true;
}
