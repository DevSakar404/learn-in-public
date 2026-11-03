import type { Greeting, IGreeter } from "@/domain/learn/greeter";
import type { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";

/** Greets with canned text, or fails with a chosen GenerationError. Records every name. */
export class FakeGreeter implements IGreeter {
  readonly names: string[] = [];
  failWith: GenerationError | null = null;

  async greet(name: string): Promise<Result<Greeting, GenerationError>> {
    this.names.push(name);
    if (this.failWith) return err(this.failWith);
    return ok({
      greeting: `Hello, ${name}!`,
      model: "fake-model-1",
      messages: [{ role: "user", content: `Hi, my name is ${name}.` }],
      usage: { inputTokens: 10, outputTokens: 5 },
      latencyMs: 5,
    });
  }
}
