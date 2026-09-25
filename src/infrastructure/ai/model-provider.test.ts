import { describe, expect, it } from "vitest";
import { envSchema } from "../config/env";
import { generatorConfig } from "./model-provider";

const base = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "k",
  SITE_URL: "http://localhost:3000",
  SITE_TIMEZONE: "UTC",
};

describe("generatorConfig", () => {
  it("routes cloud providers through Mastra's model router, in parallel", () => {
    const env = envSchema.parse({
      ...base,
      LLM_MODEL: "gemini-3.5-flash-lite",
      GOOGLE_GENERATIVE_AI_API_KEY: "g",
    });
    expect(generatorConfig(env)).toMatchObject({
      model: { id: "google/gemini-3.5-flash-lite", apiKey: "g" },
      sequential: false,
    });
  });

  it("sends ollama to its OpenAI-compatible URL, one request at a time", () => {
    const env = envSchema.parse({ ...base, LLM_PROVIDER: "ollama", LLM_MODEL: "qwen2.5-coder:7b" });
    expect(generatorConfig(env)).toMatchObject({
      model: {
        providerId: "ollama",
        modelId: "qwen2.5-coder:7b",
        url: "http://localhost:11434/v1",
      },
      label: "ollama/qwen2.5-coder:7b",
      sequential: true,
    });
  });
});
