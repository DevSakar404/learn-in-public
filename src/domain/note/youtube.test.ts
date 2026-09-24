import { describe, expect, it } from "vitest";
import { youtubeVideoId } from "./youtube";

describe("youtubeVideoId", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
  ])("extracts the id from %s", (url) => {
    expect(youtubeVideoId(url)).toBe("dQw4w9WgXcQ");
  });

  it.each([
    "https://vimeo.com/123",
    "https://evil.com/?v=dQw4w9WgXcQ",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "",
  ])("rejects %j", (url) => {
    expect(youtubeVideoId(url)).toBeNull();
  });
});
