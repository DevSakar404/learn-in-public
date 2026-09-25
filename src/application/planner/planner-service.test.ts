import { describe, expect, it } from "vitest";
import { setup } from "../../../test/fakes/setup";

// 2026-03-10 12:00 UTC = 17:30 Tuesday in Kolkata. The fake journey starts 2026-03-01; YouTube day = Sunday.
describe("PlannerService.overview", () => {
  it("reports day number, streaks and today's checklist", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.notes.publish(note.id);
    await t.generation.generate(note.id, ["x", "linkedin"]);
    const x = (await t.posts.listForNote(note.id)).find((p) => p.platform === "x")!;
    await t.posts.update(x.id, { status: "posted", postedUrl: "https://x.com/me/status/1" });

    const o = await t.planner.overview();
    expect(o.today).toBe("2026-03-10");
    expect(o.dayNumber).toBe(10);
    expect(o.streak).toBe(1);
    expect(o.longestStreak).toBe(1);
    expect(o.todo.noteDone).toBe(true);
    expect(o.todo.posted).toMatchObject({ x: true, linkedin: false });
  });

  it("builds a 13-week Monday-first heatmap ending with the current week", async () => {
    const o = await setup().planner.overview();
    expect(o.heatmap).toHaveLength(91);
    expect(o.heatmap[0]!.date).toBe("2025-12-15"); // a Monday, 12 weeks before this week's Monday
    expect(o.heatmap.find((d) => d.isToday)?.date).toBe("2026-03-10");
    expect(o.heatmap.at(-1)).toMatchObject({
      date: "2026-03-15",
      isFuture: true,
      isYoutubeDay: true,
    });
  });

  it("points at this week's YouTube day and lists the next 7 days", async () => {
    const o = await setup().planner.overview();
    expect(o.youtube).toMatchObject({
      date: "2026-03-15",
      weekday: "Sunday",
      isToday: false,
      done: false,
    });
    expect(o.upcoming).toHaveLength(7);
    expect(o.upcoming[5]!.items).toContain("20:00 · Weekly YouTube recap");
  });

  it("marks the YouTube recap done when a YouTube draft was posted this week", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.generation.generate(note.id, ["youtube"]);
    const [yt] = await t.posts.listForNote(note.id);
    await t.posts.update(yt!.id, { status: "posted" });
    expect((await t.planner.overview()).youtube.done).toBe(true);
  });
});

describe("PlannerService.calendarFeed", () => {
  it("serves the calendar for the right token only, and rotation revokes the old link", async () => {
    const t = setup();
    const token = t.store.planner.calendarToken;
    expect((await t.planner.calendarFeed(token)).ok).toBe(true);
    expect((await t.planner.calendarFeed(crypto.randomUUID())).ok).toBe(false);

    await t.planner.rotateCalendarToken();
    const old = await t.planner.calendarFeed(token);
    expect(!old.ok && old.error.code).toBe("NOT_FOUND");
  });

  it("uses the updated schedule", async () => {
    const t = setup();
    await t.planner.updateSchedule({
      dailyTime: "07:30",
      youtubeWeekday: 6,
      reminderMinutes: 15,
      journeyStart: "2026-03-01",
    });
    const ics = await t.planner.calendarFeed(t.store.planner.calendarToken);
    expect(ics.ok && ics.value).toContain("DTSTART;TZID=Asia/Kolkata:20260301T073000");
    expect(ics.ok && ics.value).toContain("BYDAY=SA");
    expect(ics.ok && ics.value).toContain("TRIGGER:-PT15M");
  });
});
