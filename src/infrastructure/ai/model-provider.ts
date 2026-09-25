import type { Env } from "../config/env";

/** Mastra accepts a model-router id or any OpenAI-compatible endpoint. */
export type ModelConfig =
  | { id: `${string}/${string}`; apiKey: string }
  | { providerId: string; modelId: string; url: string; apiKey: string };

export interface GeneratorConfig {
  model: ModelConfig;
  label: string;
  /** Per model call. */
  timeoutMs: number;
  /** One request at a time: local models share the machine's memory. */
  sequential: boolean;
}

/** LLM_PROVIDER + LLM_MODEL → how to reach the model. Switching provider is an env change only. */
export function generatorConfig(env: Env): GeneratorConfig {
  if (env.LLM_PROVIDER === "ollama") {
    return {
      model: {
        providerId: "ollama",
        modelId: env.LLM_MODEL,
        url: env.OLLAMA_URL,
        apiKey: "ollama",
      },
      label: `ollama/${env.LLM_MODEL}`,
      // ponytail: local 7B models are slow; 4 platforms in sequence can exceed Vercel's 60s, so local is dev-only.
      timeoutMs: 120_000,
      sequential: true,
    };
  }
  const apiKey =
    env.LLM_PROVIDER === "google" ? env.GOOGLE_GENERATIVE_AI_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`Missing API key for LLM_PROVIDER=${env.LLM_PROVIDER}`); // env.ts already enforces this
  const id = `${env.LLM_PROVIDER}/${env.LLM_MODEL}` as const;
  // 25s: a repair retry can make two calls, which must fit the 60s action budget.
  return { model: { id, apiKey }, label: id, timeoutMs: 25_000, sequential: false };
}
