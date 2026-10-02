export const STREAK_TARGET = 7;
export const STREAK_TIMEZONE = "Asia/Tehran";

/** YYYY-MM-DD in Tehran time. offsetDays=-1 gives yesterday. */
export function tehranDay(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: STREAK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (offsetDays === 0) return today;

  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
}