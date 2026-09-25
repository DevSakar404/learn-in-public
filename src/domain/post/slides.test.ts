import { describe, expect, it } from "vitest";
import { sampleContent } from "../../../test/fakes/sample-content";
import { slideDeck } from "./slides";

describe("slideDeck", () => {
  it("turns an Instagram carousel into portrait slides: cover, content…, closing", () => {
    const deck = slideDeck({ platform: "instagram", content: sampleContent.instagram })!;
    expect([deck.width, deck.height]).toEqual([1080, 1350]);
    expect(deck.slides.map((s) => s.kind)).toEqual([
      "cover",
      "content",
      "content",
      "content",
      "content",
      "closing",
    ]);
  });

  it("turns a LinkedIn post into one square card: hook + question", () => {
    const deck = slideDeck({ platform: "linkedin", content: sampleContent.linkedin })!;
    expect([deck.width, deck.height]).toEqual([1200, 1200]);
    expect(deck.slides).toEqual([
      { kind: "cover", title: sampleContent.linkedin.hook, body: sampleContent.linkedin.question },
    ]);
  });

  it("has no images for X or YouTube", () => {
    expect(slideDeck({ platform: "x", content: sampleContent.x })).toBeNull();
    expect(slideDeck({ platform: "youtube", content: sampleContent.youtube })).toBeNull();
  });
});
