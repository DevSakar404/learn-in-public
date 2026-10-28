import type { GenerationError } from "@/domain/shared/errors";
import type { Result } from "@/domain/shared/result";

/** One message as it was sent to the model, shown in the lesson playground. */
export interface SentMessage {
  role: "system" | "user";
  content: string;
}

export interface Greeting {
  greeting: string;
  model: string;
  messages: SentMessage[];
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

/** The LangChain intro lesson's single node: one LLM call that greets the reader. */
export interface IGreeter {
  greet(name: string): Promise<Result<Greeting, GenerationError>>;
}
