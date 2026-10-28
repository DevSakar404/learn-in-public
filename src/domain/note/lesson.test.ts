import { describe, expect, it } from "vitest";
import { splitPlayground } from "./lesson";

describe("splitPlayground", () => {
  it("returns the playground id and the body without the fence", () => {
    const md = "# Intro\n\nText.\n\n```playground\ngreet\n```\n\nMore.";
    expect(splitPlayground(md)).toEqual({
      body: "# Intro\n\nText.\n\n\n\nMore.",
      playground: "greet",
    });
  });

  it("leaves notes without a playground alone, including other code blocks", () => {
    const md = "```ts\nconst x = 1;\n```";
    expect(splitPlayground(md)).toEqual({ body: md, playground: null });
  });
});
