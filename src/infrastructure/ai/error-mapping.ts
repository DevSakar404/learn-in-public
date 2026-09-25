import { GenerationError } from "@/domain/shared/errors";

/** Walks error.cause chains; providers and Mastra wrap the original error. */
function* causes(error: unknown): Generator<Record<string, unknown>> {
  let current: unknown = error;
  for (let depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    yield current as Record<string, unknown>;
    current = (current as { cause?: unknown }).cause;
  }
}

export function toGenerationError(error: unknown): GenerationError {
  for (const e of causes(error)) {
    const name = String(e.name ?? "");
    const message = String(e.message ?? "");
    if (
      ["AbortError", "TimeoutError", "MastraTimeoutError"].includes(name) ||
      /timed? ?out/i.test(message)
    ) {
      return new GenerationError("timeout", "The model took too long to respond. Try again.");
    }
    if (
      e.statusCode === 429 ||
      e.status === 429 ||
      /\b429\b|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message)
    ) {
      return new GenerationError(
        "rate_limit",
        "Rate limit reached (free tier). Wait a minute, then retry one platform at a time.",
      );
    }
  }
  for (const e of causes(error)) {
    const message = String(e.message ?? "");
    if (
      e.statusCode === 503 ||
      e.status === 503 ||
      /high demand|overloaded|UNAVAILABLE/i.test(message)
    ) {
      return new GenerationError(
        "rate_limit",
        "The model is overloaded right now (common for the newest free models). Retry in a minute, or use a lighter LLM_MODEL.",
      );
    }
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return new GenerationError("provider", `The model provider returned an error: ${message}`);
}
