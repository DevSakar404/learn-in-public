import {
  JOURNEY_DAYS,
  MILESTONE_DAYS,
  type PlannerSchedule,
} from "@/domain/planner/planner-settings";
import { addDays, weekdayOf } from "../streak";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

/** RFC 5545 TEXT escaping. */
const text = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const date = (key: string) => key.replaceAll("-", "");
const localDateTime = (key: string, hhmm: string) => `${date(key)}T${hhmm.replace(":", "")}00`;
const utcStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/** RFC 5545 §3.1: lines longer than 75 octets continue on the next line after CRLF + space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

interface FeedOptions {
  timeZone: string;
  siteName: string;
  siteUrl: string;
  now: Date;
}

/**
 * The planner as an iCalendar subscription: a daily publishing slot, a weekly YouTube recap and milestone days,
 * each timed slot with an alarm. Calendar apps handle the reminders.
 */
export function renderCalendar(s: PlannerSchedule, o: FeedOptions): string {
  const host = new URL(o.siteUrl).hostname;
  const stamp = utcStamp(o.now);
  const plannerUrl = new URL("/admin/planner", o.siteUrl).toString();
  // ponytail: TZID with an IANA name and no VTIMEZONE block. Google, Apple and Outlook accept it; strict parsers may not.
  const alarm = [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:-PT${s.reminderMinutes}M`,
    "DESCRIPTION:Reminder",
    "END:VALARM",
  ];
  const firstYoutubeDay = addDays(
    s.journeyStart,
    (s.youtubeWeekday - weekdayOf(s.journeyStart) + 7) % 7,
  );

  const events = [
    [
      "BEGIN:VEVENT",
      `UID:daily-publish@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${o.timeZone}:${localDateTime(s.journeyStart, s.dailyTime)}`,
      "DURATION:PT30M",
      `RRULE:FREQ=DAILY;COUNT=${JOURNEY_DAYS}`,
      `SUMMARY:${text("Publish today's note + post the drafts")}`,
      `DESCRIPTION:${text(`Write and publish the daily note, then copy the X, LinkedIn and Instagram drafts. ${plannerUrl}`)}`,
      `URL:${plannerUrl}`,
      ...alarm,
      "END:VEVENT",
    ],
    [
      "BEGIN:VEVENT",
      `UID:weekly-youtube@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${o.timeZone}:${localDateTime(firstYoutubeDay, s.dailyTime)}`,
      "DURATION:PT1H",
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[s.youtubeWeekday]};COUNT=${Math.ceil(JOURNEY_DAYS / 7)}`,
      `SUMMARY:${text("Publish the weekly YouTube recap")}`,
      `DESCRIPTION:${text(`Record and upload this week's recap video. ${plannerUrl}`)}`,
      `URL:${plannerUrl}`,
      ...alarm,
      "END:VEVENT",
    ],
    ...MILESTONE_DAYS.map((n) => {
      const day = addDays(s.journeyStart, n - 1);
      return [
        "BEGIN:VEVENT",
        `UID:milestone-${n}@${host}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${date(day)}`,
        `DTEND;VALUE=DATE:${date(addDays(day, 1))}`,
        `SUMMARY:${text(`${o.siteName}: Day ${n} milestone`)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
  ];

  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${text(o.siteName)}//Planner//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${text(o.siteName)}`,
      `X-WR-TIMEZONE:${o.timeZone}`,
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      "X-PUBLISHED-TTL:PT6H",
      ...events.flat(),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
