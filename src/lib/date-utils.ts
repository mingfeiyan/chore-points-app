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
 * Check if today is a weekday in PT timezone.
 */
export function isWeekdayPT(): boolean {
  const now = new Date();
  const ptDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
  }).format(now);
  return !["Sat", "Sun"].includes(ptDay);
}

/**
 * Check if a chore should be shown today based on its schedule.
 * Chores with "_weekday" suffix only show on Mon-Fri.
 */
export function isChoreActiveToday(schedule: string): boolean {
  if (schedule.endsWith("_weekday")) {
    return isWeekdayPT();
  }
  return true;
}
