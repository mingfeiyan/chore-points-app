/**
 * Get the Saturday 00:00:00 of the week containing the given date.
 * Week starts on Saturday (so parents have time to prepare).
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  // We want Saturday as day 0, so: (day + 1) % 7 gives us days since Saturday
  const daysSinceSaturday = (day + 1) % 7
  d.setDate(d.getDate() - daysSinceSaturday)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Check if two dates are in the same week (Saturday to Friday).
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  const week1 = getWeekStart(date1)
  const week2 = getWeekStart(date2)
  return week1.getTime() === week2.getTime()
}

/**
 * Get the Sunday 00:00:00 of the calendar week containing the given date.
 * Used for the parent weekly-points total (distinct from the Saturday-
 * anchored meal-planning week).
 */
export function getSundayWeekStart(date: Date): Date {
  const d = new Date(date)
  const daysSinceSunday = d.getDay()
  d.setDate(d.getDate() - daysSinceSunday)
  d.setHours(0, 0, 0, 0)
  return d
}
