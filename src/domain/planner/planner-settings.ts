import { z } from "zod";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** The schedule: everything is due at `dailyTime` (site time zone); YouTube recap weekly on `youtubeWeekday`. */
export const plannerScheduleSchema = z.object({
  dailyTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 20:00"),
  youtubeWeekday: z.coerce.number().int().min(0).max(6),
  reminderMinutes: z.coerce.number().int().min(0).max(1440),
  journeyStart: z.iso.date("Use a date like 2026-09-24"),
});
export type PlannerSchedule = z.infer<typeof plannerScheduleSchema>;

export interface PlannerSettings extends PlannerSchedule {
  /** Secret in the calendar subscription URL. */
  calendarToken: string;
}

/** How long the learning journey runs, and the days worth celebrating. */
export const JOURNEY_DAYS = 90;
export const MILESTONE_DAYS = [30, 60, 90] as const;
