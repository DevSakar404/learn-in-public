import type { IClock } from "@/domain/clock";
import type { INoteReader } from "@/domain/note/note-repository";
import {
  JOURNEY_DAYS,
  MILESTONE_DAYS,
  WEEKDAYS,
  type PlannerSchedule,
  type PlannerSettings,
} from "@/domain/planner/planner-settings";
import type {
  IPlannerSettingsReader,
  IPlannerSettingsWriter,
} from "@/domain/planner/planner-settings-repository";
import { PLATFORMS, type Platform } from "@/domain/post/post";
import type { IPostReader } from "@/domain/post/post-repository";
import { ok, type Result } from "@/domain/shared/result";
import { addDays, dayKey, daysBetween, learningStreak, longestStreak, weekdayOf } from "../streak";
import { renderCalendar } from "./ics";

export interface HeatmapDay {
  date: string;
  published: boolean;
  isToday: boolean;
  isFuture: boolean;
  isYoutubeDay: boolean;
}

export interface PlannerOverview {
  today: string;
  /** 1-based day of the journey (≤ 0 before it starts). */
  dayNumber: number;
  journeyDays: number;
  streak: number;
  longestStreak: number;
  /** 13 weeks, Monday-first, oldest first; the last week is the current one. */
  heatmap: HeatmapDay[];
  todo: { noteDone: boolean; posted: Record<Platform, boolean> };
  youtube: { date: string; weekday: string; isToday: boolean; done: boolean };
  upcoming: { date: string; items: string[] }[];
  settings: PlannerSettings;
}

const HEATMAP_WEEKS = 13;

export class PlannerService {
  constructor(
    private readonly notes: INoteReader,
    private readonly posts: IPostReader,
    private readonly settingsReader: IPlannerSettingsReader,
    private readonly settingsWriter: IPlannerSettingsWriter,
    private readonly clock: IClock,
    private readonly site: { timeZone: string; siteName: string; siteUrl: string },
  ) {}

  // ponytail: reads all published notes to build the heatmap; fine for a 90-day journey (tech debt #9 covers SQL).
  async overview(): Promise<PlannerOverview> {
    const tz = this.site.timeZone;
    const now = this.clock.now();
    const today = dayKey(now, tz);
    const [settings, published, recentlyPosted] = await Promise.all([
      this.settingsReader.get(),
      this.notes.list({ status: "published" }),
      this.posts.listPostedSince(new Date(now.getTime() - 14 * 86_400_000)),
    ]);

    const publishedAt = published.flatMap((n) => (n.publishedAt ? [n.publishedAt] : []));
    const publishedDays = new Set(publishedAt.map((d) => dayKey(d, tz)));
    const postedDays = recentlyPosted.map((p) => ({
      platform: p.platform,
      day: dayKey(p.postedAt!, tz),
    }));

    const thisMonday = addDays(today, -((weekdayOf(today) + 6) % 7));
    const heatmap = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) => {
      const date = addDays(thisMonday, i - (HEATMAP_WEEKS - 1) * 7);
      return {
        date,
        published: publishedDays.has(date),
        isToday: date === today,
        isFuture: date > today,
        isYoutubeDay: weekdayOf(date) === settings.youtubeWeekday,
      };
    });

    const youtubeDate = addDays(today, (settings.youtubeWeekday - weekdayOf(today) + 7) % 7);
    const youtubeWindowStart = addDays(youtubeDate, -6);

    const upcoming = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const n = daysBetween(settings.journeyStart, date) + 1;
      const items = [`${settings.dailyTime} · Publish the note + post the drafts`];
      if (weekdayOf(date) === settings.youtubeWeekday)
        items.push(`${settings.dailyTime} · Weekly YouTube recap`);
      if ((MILESTONE_DAYS as readonly number[]).includes(n)) items.push(`Milestone: Day ${n}`);
      return { date, items };
    });

    return {
      today,
      dayNumber: daysBetween(settings.journeyStart, today) + 1,
      journeyDays: JOURNEY_DAYS,
      streak: learningStreak(publishedAt, now, tz),
      longestStreak: longestStreak(publishedAt, tz),
      heatmap,
      todo: {
        noteDone: publishedDays.has(today),
        posted: Object.fromEntries(
          PLATFORMS.map((p) => [p, postedDays.some((x) => x.platform === p && x.day === today)]),
        ) as Record<Platform, boolean>,
      },
      youtube: {
        date: youtubeDate,
        weekday: WEEKDAYS[settings.youtubeWeekday]!,
        isToday: youtubeDate === today,
        done: postedDays.some(
          (x) => x.platform === "youtube" && x.day >= youtubeWindowStart && x.day <= youtubeDate,
        ),
      },
      upcoming,
      settings,
    };
  }

  updateSchedule(schedule: PlannerSchedule): Promise<Result<PlannerSettings>> {
    return this.settingsWriter.update(schedule);
  }

  rotateCalendarToken(): Promise<Result<PlannerSettings>> {
    return this.settingsWriter.rotateToken();
  }

  /** The public .ics feed. NotFound for an unknown token. */
  async calendarFeed(token: string): Promise<Result<string>> {
    const schedule = await this.settingsReader.scheduleForToken(token);
    if (!schedule.ok) return schedule;
    return ok(renderCalendar(schedule.value, { ...this.site, now: this.clock.now() }));
  }
}
