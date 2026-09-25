import { describe, expect, it } from "vitest";
import { renderCalendar } from "./ics";

const schedule = {
  dailyTime: "20:00",
  youtubeWeekday: 0,
  reminderMinutes: 30,
  journeyStart: "2026-09-24",
};
const options = {
  timeZone: "Asia/Kolkata",
  siteName: "Learn in Public",
  siteUrl: "https://example.dev",
  now: new Date("2026-09-25T10:00:00Z"),
};
const ics = renderCalendar(schedule, options);

describe("renderCalendar", () => {
  it("is a CRLF iCalendar document", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("repeats the daily slot at the daily time in the site time zone, with an alarm", () => {
    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20260924T200000");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=90");
    expect(ics).toContain("TRIGGER:-PT30M");
  });

  it("starts the weekly YouTube recap on the first chosen weekday on/after the journey start", () => {
    // 2026-09-24 is a Thursday → first Sunday is 2026-09-27
    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20260927T200000");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=SU;COUNT=13");
  });

  it("adds all-day milestones on days 30, 60 and 90", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20261023"); // day 30
    expect(ics).toContain("DTSTART;VALUE=DATE:20261222"); // day 90
    expect(ics.match(/milestone-\d+@/g)).toHaveLength(3);
  });

  it("folds every line to at most 75 bytes, without splitting characters", () => {
    const long = renderCalendar(schedule, {
      ...options,
      siteName: "Learn in Public: notes about tokens, embeddings — and ✨ ".repeat(3),
    });
    for (const line of long.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const unfolded = long.replace(/\r\n /g, "");
    expect(unfolded).toContain("embeddings — and ✨");
  });

  it("uses the bare hostname in event UIDs", () => {
    const local = renderCalendar(schedule, { ...options, siteUrl: "http://localhost:3000" });
    expect(local).toContain("UID:daily-publish@localhost\r\n");
  });

  it("escapes text fields", () => {
    const tricky = renderCalendar(schedule, { ...options, siteName: "A, B; C\\D" });
    expect(tricky).toContain("X-WR-CALNAME:A\\, B\; C\\\\D");
  });
});
