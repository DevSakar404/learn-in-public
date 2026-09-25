import type { Result } from "../shared/result";
import type { PlannerSchedule, PlannerSettings } from "./planner-settings";

export interface IPlannerSettingsReader {
  get(): Promise<PlannerSettings>;
  /** Public calendar feed: the schedule for a matching token, NotFound otherwise. Never returns the token. */
  scheduleForToken(token: string): Promise<Result<PlannerSchedule>>;
}

export interface IPlannerSettingsWriter {
  update(schedule: PlannerSchedule): Promise<Result<PlannerSettings>>;
  rotateToken(): Promise<Result<PlannerSettings>>;
}
