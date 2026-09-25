/** YYYY-MM-DD of `date` as seen in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Calendar arithmetic on YYYY-MM-DD keys (time-zone free once you have the key). */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay();

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const previousDay = (key: string) => addDays(key, -1);

/**
 * Consecutive calendar days (in `timeZone`) with at least one published note, counting back from today.
 * If nothing is published today yet, counting starts from yesterday: the streak isn't broken until the day ends.
 */
export function learningStreak(publishedAt: readonly Date[], now: Date, timeZone: string): number {
  const days = new Set(publishedAt.map((d) => dayKey(d, timeZone)));
  let day = dayKey(now, timeZone);
  if (!days.has(day)) day = previousDay(day);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

/** The longest run of consecutive publishing days ever. */
export function longestStreak(publishedAt: readonly Date[], timeZone: string): number {
  const days = [...new Set(publishedAt.map((d) => dayKey(d, timeZone)))].sort();
  let best = 0;
  let run = 0;
  days.forEach((day, i) => {
    run = i > 0 && daysBetween(days[i - 1]!, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}
