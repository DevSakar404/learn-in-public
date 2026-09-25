import { Agent } from "@mastra/core/agent";
import type {
  GenerationOutput,
  GenerationRequest,
  IContentGenerator,
} from "@/domain/post/content-generator";
import { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import { z } from "zod";
import { toGenerationError } from "./error-mapping";
import type { GeneratorConfig } from "./model-provider";

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const repairPrompt = (original: string, previous: string, problems: string) =>
  `${original}

Your previous answer did not pass validation.
Previous answer:
${previous}

Problems:
${problems}

Return the complete corrected answer. Fix every problem listed and keep everything else.`;

/** The only place in the app that talks to Mastra. */
export class MastraContentGenerator implements IContentGenerator {
  /** Tail of the request queue when `sequential` (shared by all callers of this instance). */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: GeneratorConfig) {}

  generate<T>(
    request: GenerationRequest<T>,
  ): Promise<Result<GenerationOutput<T>, GenerationError>> {
    if (!this.config.sequential) return this.run(request);
    const next = this.queue.then(() => this.run(request)); // run() never rejects
    this.queue = next;
    return next;
  }

  private async run<T>(
    request: GenerationRequest<T>,
  ): Promise<Result<GenerationOutput<T>, GenerationError>> {
    // Stateless, one-shot: the platform instructions are the agent's instructions (stable prefix → prompt caching).
    const agent = new Agent({
      id: "content-drafter",
      name: "Content drafter",
      instructions: request.system,
      model: this.config.model,
    });
    const started = Date.now();
    const call = (prompt: string) =>
      agent.generate(prompt, {
        structuredOutput: { schema: request.schema, errorStrategy: "warn" },
        maxSteps: 1,
        abortSignal: AbortSignal.timeout(this.config.timeoutMs),
        modelSettings: {
          temperature: 0.7,
          maxRetries: 0,
          timeout: { totalMs: this.config.timeoutMs },
        },
      });

    try {
      let result = await call(request.prompt);
      // Never trust model output: re-validate with our schema (limits like 270 chars are checked here).
      let parsed = request.schema.safeParse(result.object ?? safeJson(result.text));
      let inputTokens = result.usage?.inputTokens ?? 0;
      let outputTokens = result.usage?.outputTokens ?? 0;

      // One repair attempt: tell the model exactly what failed. Small models sometimes miss a count or a limit.
      if (!parsed.success) {
        console.warn("[ai] invalid output, repairing once", {
          model: this.config.label,
          issues: parsed.error.issues,
        });
        result = await call(
          repairPrompt(request.prompt, result.text, z.prettifyError(parsed.error)),
        );
        parsed = request.schema.safeParse(result.object ?? safeJson(result.text));
        inputTokens += result.usage?.inputTokens ?? 0;
        outputTokens += result.usage?.outputTokens ?? 0;
      }
      if (!parsed.success) {
        console.error("[ai] invalid output", {
          model: this.config.label,
          issues: parsed.error.issues,
          raw: result.text,
        });
        return err(
          new GenerationError(
            "invalid_output",
            "The model returned a draft in the wrong format. Try again.",
          ),
        );
      }

      return ok({
        content: parsed.data,
        modelUsed: result.response?.modelId ?? this.config.label,
        usage: { inputTokens, outputTokens, latencyMs: Date.now() - started },
      });
    } catch (error) {
      const mapped = toGenerationError(error);
      console.error(`[ai] ${mapped.kind}`, { model: this.config.label, error });
      return err(mapped);
    }
  }
}
