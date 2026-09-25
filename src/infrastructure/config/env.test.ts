import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const valid = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  SITE_URL: "http://localhost:3000",
  SITE_TIMEZONE: "Asia/Kolkata",
  LLM_MODEL: "gemini-2.5-flash",
  GOOGLE_GENERATIVE_AI_API_KEY: "key",
};

describe("envSchema", () => {
  it("accepts a valid env and defaults the provider to google", () => {
    expect(envSchema.parse(valid).LLM_PROVIDER).toBe("google");
  });

  it("rejects an invalid time zone", () => {
    expect(envSchema.safeParse({ ...valid, SITE_TIMEZONE: "Mars/Base" }).success).toBe(false);
  });

  it("rejects floating -latest models", () => {
    expect(envSchema.safeParse({ ...valid, LLM_MODEL: "gemini-flash-latest" }).success).toBe(false);
  });

  it("treats empty values as unset", () => {
    expect(envSchema.safeParse({ ...valid, GOOGLE_GENERATIVE_AI_API_KEY: "" }).success).toBe(false);
  });

  it("requires the API key of the selected provider", () => {
    expect(envSchema.safeParse({ ...valid, LLM_PROVIDER: "openai" }).success).toBe(false);
    expect(
      envSchema.safeParse({ ...valid, LLM_PROVIDER: "openai", OPENAI_API_KEY: "k" }).success,
    ).toBe(true);
  });

  it("needs no API key for local ollama and defaults its URL", () => {
    const env = envSchema.parse({
      ...valid,
      GOOGLE_GENERATIVE_AI_API_KEY: undefined,
      LLM_PROVIDER: "ollama",
      LLM_MODEL: "qwen2.5-coder:7b",
    });
    expect(env.OLLAMA_URL).toBe("http://localhost:11434/v1");
  });
});
