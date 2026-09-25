import type { PlannerSchedule, PlannerSettings } from "@/domain/planner/planner-settings";
import type {
  IPlannerSettingsReader,
  IPlannerSettingsWriter,
} from "@/domain/planner/planner-settings-repository";
import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Tables } from "../supabase/database.types";
import type { Db } from "../supabase/server-client";
import { throwOnError, toDomainError } from "./db-errors";

type ScheduleRow = Pick<
  Tables<"planner_settings">,
  "daily_time" | "youtube_weekday" | "reminder_minutes" | "journey_start"
>;

const toSchedule = (r: ScheduleRow): PlannerSchedule => ({
  dailyTime: r.daily_time.slice(0, 5), // "20:00:00" → "20:00"
  youtubeWeekday: r.youtube_weekday,
  reminderMinutes: r.reminder_minutes,
  journeyStart: r.journey_start,
});

const toSettings = (r: Tables<"planner_settings">): PlannerSettings => ({
  ...toSchedule(r),
  calendarToken: r.calendar_token,
});

/** The single planner_settings row (created by the migration). */
export class SupabasePlannerSettingsRepository
  implements IPlannerSettingsReader, IPlannerSettingsWriter
{
  constructor(private readonly db: Db) {}

  async get(): Promise<PlannerSettings> {
    const row = throwOnError(
      await this.db.from("planner_settings").select().maybeSingle(),
      "Load planner settings",
    );
    if (!row) throw new Error("planner_settings row is missing (run the migrations)");
    return toSettings(row);
  }

  /** Works for the anonymous client via the security-definer planner_feed() function. */
  async scheduleForToken(token: string): Promise<Result<PlannerSchedule>> {
    const rows = throwOnError(await this.db.rpc("planner_feed", { token }), "Load calendar feed");
    const row = rows?.[0];
    return row ? ok(toSchedule(row)) : err(new NotFoundError("Calendar", token));
  }

  async update(s: PlannerSchedule): Promise<Result<PlannerSettings>> {
    const { data, error } = await this.db
      .from("planner_settings")
      .update({
        daily_time: s.dailyTime,
        youtube_weekday: s.youtubeWeekday,
        reminder_minutes: s.reminderMinutes,
        journey_start: s.journeyStart,
      })
      .eq("id", true)
      .select()
      .maybeSingle();
    if (error) return err(toDomainError(error, "planner settings", "write"));
    return data ? ok(toSettings(data)) : err(new NotFoundError("Planner settings", ""));
  }

  async rotateToken(): Promise<Result<PlannerSettings>> {
    const { data, error } = await this.db
      .from("planner_settings")
      .update({ calendar_token: crypto.randomUUID() })
      .eq("id", true)
      .select()
      .maybeSingle();
    if (error) return err(toDomainError(error, "planner settings", "write"));
    return data ? ok(toSettings(data)) : err(new NotFoundError("Planner settings", ""));
  }
}
