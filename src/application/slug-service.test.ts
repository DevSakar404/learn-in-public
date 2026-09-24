import { describe, expect, it } from "vitest";
import { SlugService } from "./slug-service";

const slugs = new SlugService();

describe("SlugService.slugify", () => {
  it.each([
    ["Day 1: What a Token Really Is", "day-1-what-a-token-really-is"],
    ["  Crème brûlée & RAG!  ", "creme-brulee-rag"],
    ["---", "untitled"],
    ["", "untitled"],
    ["LLM's 101 -- tips", "llm-s-101-tips"],
  ])("%j → %j", (input, expected) => {
    expect(slugs.slugify(input)).toBe(expected);
  });

  it("caps length at 80 without a trailing dash", () => {
    const slug = slugs.slugify("a ".repeat(100));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("SlugService.unique", () => {
  it("adds -2, -3 until free", async () => {
    const taken = new Set(["rag", "rag-2"]);
    expect(await slugs.unique("RAG", async (s) => taken.has(s))).toBe("rag-3");
  });

  it("returns the base slug when free", async () => {
    expect(await slugs.unique("RAG", async () => false)).toBe("rag");
  });
});
