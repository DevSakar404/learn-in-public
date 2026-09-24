import type { Env } from "../config/env";

/** LLM_PROVIDER + LLM_MODEL → Mastra model-router config. Switching provider is an env change only. */
export function modelConfig(env: Env): { id: `${string}/${string}`; apiKey: string } {
  const apiKey =
    env.LLM_PROVIDER === "google" ? env.GOOGLE_GENERATIVE_AI_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`Missing API key for LLM_PROVIDER=${env.LLM_PROVIDER}`); // env.ts already enforces this
  return { id: `${env.LLM_PROVIDER}/${env.LLM_MODEL}`, apiKey };
}
