import { describe, expect, it } from "vitest";
import { sessionMinutes } from "./session";

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("sessionMinutes", () => {
  it("uses the admin's minutes when set", () => {
    expect(sessionMinutes({ sessionMinutes: 12, contentMd: words(5000) })).toBe(12);
  });

  it("falls back to reading time at 200 words per minute, rounded up", () => {
    expect(sessionMinutes({ sessionMinutes: null, contentMd: words(2001) })).toBe(11);
  });

  it("never goes under 5 minutes", () => {
    expect(sessionMinutes({ sessionMinutes: null, contentMd: "" })).toBe(5);
    expect(sessionMinutes({ sessionMinutes: null, contentMd: words(300) })).toBe(5);
  });
});
