import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import type { Greeting, IGreeter } from "@/domain/learn/greeter";
import { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import { toPublicGenerationError } from "./error-mapping";

// The LangChain intro lesson (docs/lessons/01-langchain-intro.md) teaches the code in this file.
export const GREET_MODEL = "gpt-4o-mini";

const greetPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a friendly tutor on a learn-in-public blog about AI engineering. " +
      "Greet the reader by name in one or two short sentences and welcome them to their first LangChain lesson.",
  ],
  ["human", "Hi, my name is {name}."],
]);

interface GreetState {
  name: string;
  greeting?: string;
}

/** A node: a plain async function that takes state, makes one LLM call, and returns new state. */
export async function greetNode(state: GreetState, model: ChatOpenAI) {
  const chain = greetPrompt.pipe(model);
  const reply = await chain.invoke({ name: state.name });
  return { state: { ...state, greeting: reply.text }, usage: reply.usage_metadata };
}

export class LangChainGreeter implements IGreeter {
  private model: ChatOpenAI | undefined;

  constructor(private readonly apiKey: string | undefined) {}

  async greet(name: string): Promise<Result<Greeting, GenerationError>> {
    if (!this.apiKey) {
      return err(
        new GenerationError("provider", "This demo isn't switched on yet. Check back soon."),
      );
    }
    this.model ??= new ChatOpenAI({
      model: GREET_MODEL,
      apiKey: this.apiKey,
      maxTokens: 80,
      timeout: 15_000,
      maxRetries: 0,
    });

    const started = Date.now();
    try {
      const [sent, { state, usage }] = await Promise.all([
        greetPrompt.formatMessages({ name }),
        greetNode({ name }, this.model),
      ]);
      return ok({
        greeting: state.greeting ?? "",
        model: GREET_MODEL,
        messages: sent.map((m) => ({
          role: m.type === "system" ? "system" : "user",
          content: m.text,
        })),
        usage: { inputTokens: usage?.input_tokens ?? 0, outputTokens: usage?.output_tokens ?? 0 },
        latencyMs: Date.now() - started,
      });
    } catch (error) {
      return err(toPublicGenerationError(error, "greet", { model: GREET_MODEL }));
    }
  }
}
