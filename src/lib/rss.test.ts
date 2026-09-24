import { describe, expect, it } from "vitest";
import { renderRss } from "./rss";

describe("renderRss", () => {
  const xml = renderRss({ title: "A & B", url: "https://x.dev", description: "d" }, [
    {
      title: `<script>"x"</script>`,
      url: "https://x.dev/blog/a?b=1&c=2",
      description: "Tom's note",
      publishedAt: new Date("2026-03-10T12:00:00Z"),
      category: "RAG",
    },
  ]);

  it("escapes XML special characters", () => {
    expect(xml).toContain("<title>A &amp; B</title>");
    expect(xml).toContain("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
    expect(xml).toContain("https://x.dev/blog/a?b=1&amp;c=2");
    expect(xml).toContain("Tom&apos;s note");
    expect(xml).not.toContain("<script>");
  });

  it("uses RFC 822 dates", () => {
    expect(xml).toContain("<pubDate>Tue, 10 Mar 2026 12:00:00 GMT</pubDate>");
  });
});
