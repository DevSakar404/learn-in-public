/** YYYY-MM-DD of `date` as seen in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function previousDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

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
