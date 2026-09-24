import { describe, expect, it } from "vitest";
import { sampleContent } from "../../../test/fakes/sample-content";
import { toPlainText } from "./format";
import { isLocked, platformContentSchemas, PLATFORMS, TWEET_MAX } from "./post";

describe("platformContentSchemas", () => {
  it.each(PLATFORMS)("accepts a valid %s sample", (p) => {
    expect(platformContentSchemas[p].safeParse(sampleContent[p]).success).toBe(true);
  });

  it("rejects tweets over the limit", () => {
    const long = { post: "x".repeat(TWEET_MAX + 1), thread: [] };
    expect(platformContentSchemas.x.safeParse(long).success).toBe(false);
  });

  it("requires 6 to 8 Instagram slides", () => {
    const five = { ...sampleContent.instagram, slides: sampleContent.instagram.slides.slice(0, 5) };
    expect(platformContentSchemas.instagram.safeParse(five).success).toBe(false);
  });

  it("requires hashtags to look like #tags", () => {
    const bad = { ...sampleContent.instagram, hashtags: ["ai", "#ok", "#fine"] };
    expect(platformContentSchemas.instagram.safeParse(bad).success).toBe(false);
  });

  it("requires 3 to 5 YouTube titles", () => {
    const two = { ...sampleContent.youtube, titleOptions: ["a", "b"] };
    expect(platformContentSchemas.youtube.safeParse(two).success).toBe(false);
  });
});

describe("toPlainText", () => {
  it("joins an X thread with separators", () => {
    expect(toPlainText({ platform: "x", content: { post: "One", thread: ["Two"] } })).toBe(
      "One\n\n---\n\nTwo",
    );
  });

  it("numbers Instagram slides and appends caption + hashtags", () => {
    const text = toPlainText({ platform: "instagram", content: sampleContent.instagram });
    expect(text).toContain("Slide 1: Slide 1\nOne idea.");
    expect(text.endsWith("#aiengineering #llm #typescript")).toBe(true);
  });
});

describe("isLocked", () => {
  it("locks everything except drafts", () => {
    expect(isLocked({ status: "draft" })).toBe(false);
    expect(isLocked({ status: "approved" })).toBe(true);
    expect(isLocked({ status: "posted" })).toBe(true);
  });
});
