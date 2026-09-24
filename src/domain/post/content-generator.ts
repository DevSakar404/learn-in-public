import type { z } from "zod";
import type { GenerationError } from "../shared/errors";
import type { Result } from "../shared/result";
import type { GenerationUsage } from "./post";

export interface GenerationRequest<T> {
  /** Stable instructions (voice + platform rules). Sent first so provider prompt caching can hit. */
  system: string;
  /** Variable input (the note). */
  prompt: string;
  schema: z.ZodType<T>;
}

export interface GenerationOutput<T> {
  content: T;
  modelUsed: string;
  usage: GenerationUsage;
}

export interface IContentGenerator {
  generate<T>(request: GenerationRequest<T>): Promise<Result<GenerationOutput<T>, GenerationError>>;
}
