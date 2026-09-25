import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Stand-in for Mastra's Agent: each generate() call returns the next queued response.
const responses: { object?: unknown; text: string }[] = [];
const prompts: string[] = [];
let inFlight = 0;
let maxInFlight = 0;
vi.mock("@mastra/core/agent", () => ({
  Agent: class {
    async generate(prompt: string) {
      prompts.push(prompt);
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      const next = responses.shift();
      if (!next) throw new Error("no response queued");
      return {
        ...next,
        usage: { inputTokens: 10, outputTokens: 5 },
        response: { modelId: "mock-model" },
      };
    }
  },
}));

const { MastraContentGenerator } = await import("./mastra-content-generator");
const schema = z.object({ slides: z.array(z.string()).min(2) });
const config = {
  model: { id: "google/mock", apiKey: "k" } as const,
  label: "google/mock",
  timeoutMs: 1000,
  sequential: false,
};
const generator = new MastraContentGenerator(config);
const request = { system: "sys", prompt: "note", schema };

describe("MastraContentGenerator", () => {
  beforeEach(() => {
    responses.length = 0;
    prompts.length = 0;
    maxInFlight = 0;
  });

  it("returns valid output from the first call", async () => {
    responses.push({ object: { slides: ["a", "b"] }, text: "" });
    const r = await generator.generate(request);
    expect(r.ok && r.value).toMatchObject({
      content: { slides: ["a", "b"] },
      modelUsed: "mock-model",
    });
    expect(prompts).toHaveLength(1);
  });

  it("repairs invalid output once, telling the model what failed", async () => {
    responses.push(
      { object: undefined, text: '{"slides":["a"]}' },
      { object: { slides: ["a", "b"] }, text: "" },
    );
    const r = await generator.generate(request);
    expect(r.ok).toBe(true);
    expect(prompts[1]).toContain('{"slides":["a"]}');
    expect(prompts[1]).toMatch(/did not pass validation/);
    expect(r.ok && r.value.usage).toMatchObject({ inputTokens: 20, outputTokens: 10 });
  });

  it("gives up with invalid_output after one failed repair", async () => {
    responses.push({ text: '{"slides":[]}' }, { text: "not json" });
    const r = await generator.generate(request);
    expect(!r.ok && r.error.kind).toBe("invalid_output");
    expect(prompts).toHaveLength(2);
  });

  it("runs requests one at a time when sequential (local models)", async () => {
    const local = new MastraContentGenerator({ ...config, sequential: true });
    for (let i = 0; i < 4; i++) responses.push({ object: { slides: ["a", "b"] }, text: "" });
    const results = await Promise.all(Array.from({ length: 4 }, () => local.generate(request)));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(maxInFlight).toBe(1);
  });

  it("runs requests in parallel for cloud models", async () => {
    for (let i = 0; i < 4; i++) responses.push({ object: { slides: ["a", "b"] }, text: "" });
    await Promise.all(Array.from({ length: 4 }, () => generator.generate(request)));
    expect(maxInFlight).toBe(4);
  });
});
