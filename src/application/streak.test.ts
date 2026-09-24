import { describe, expect, it } from "vitest";
import { learningStreak } from "./streak";

const TZ = "Asia/Kolkata"; // UTC+5:30
const at = (iso: string) => new Date(iso);
const now = at("2026-03-10T12:00:00Z"); // 17:30 on 10 Mar in Kolkata

describe("learningStreak", () => {
  it("is 0 with no notes", () => {
    expect(learningStreak([], now, TZ)).toBe(0);
  });

  it("counts consecutive days including today", () => {
    const dates = [
      at("2026-03-10T05:00:00Z"),
      at("2026-03-09T05:00:00Z"),
      at("2026-03-08T05:00:00Z"),
    ];
    expect(learningStreak(dates, now, TZ)).toBe(3);
  });

  it("does not break the streak just because today has no note yet", () => {
    expect(learningStreak([at("2026-03-09T05:00:00Z"), at("2026-03-08T05:00:00Z")], now, TZ)).toBe(
      2,
    );
  });

  it("stops at a gap", () => {
    expect(learningStreak([at("2026-03-10T05:00:00Z"), at("2026-03-08T05:00:00Z")], now, TZ)).toBe(
      1,
    );
  });

  it("counts two notes on the same day once", () => {
    expect(learningStreak([at("2026-03-10T04:00:00Z"), at("2026-03-10T06:00:00Z")], now, TZ)).toBe(
      1,
    );
  });

  it("uses the site time zone for the day boundary", () => {
    // 19:00 UTC on 9 Mar is 00:30 on 10 Mar in Kolkata → counts as today there, yesterday in UTC.
    const lateUtc = [at("2026-03-09T19:00:00Z")];
    expect(learningStreak(lateUtc, now, TZ)).toBe(1);
    expect(learningStreak(lateUtc, at("2026-03-11T12:00:00Z"), "UTC")).toBe(0);
  });
});
