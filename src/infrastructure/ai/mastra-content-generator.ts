import { Agent } from "@mastra/core/agent";
import type {
  GenerationOutput,
  GenerationRequest,
  IContentGenerator,
} from "@/domain/post/content-generator";
import { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import { toGenerationError } from "./error-mapping";

const TIMEOUT_MS = 45_000;

/** The only place in the app that talks to Mastra. */
export class MastraContentGenerator implements IContentGenerator {
  constructor(private readonly model: { id: `${string}/${string}`; apiKey: string }) {}

  async generate<T>(
    request: GenerationRequest<T>,
  ): Promise<Result<GenerationOutput<T>, GenerationError>> {
    // Stateless, one-shot: the platform instructions are the agent's instructions (stable prefix → prompt caching).
    const agent = new Agent({
      id: "content-drafter",
      name: "Content drafter",
      instructions: request.system,
      model: this.model,
    });
    const started = Date.now();

    try {
      const result = await agent.generate(request.prompt, {
        structuredOutput: { schema: request.schema, errorStrategy: "warn" },
        maxSteps: 1,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
        modelSettings: { temperature: 0.7, maxRetries: 0, timeout: { totalMs: TIMEOUT_MS } },
      });

      // Never trust model output: re-validate with our schema (limits like 270 chars are checked here).
      const parsed = request.schema.safeParse(result.object);
      if (!parsed.success) {
        console.error("[ai] invalid output", {
          model: this.model.id,
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
        modelUsed: result.response?.modelId ?? this.model.id,
        usage: {
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          latencyMs: Date.now() - started,
        },
      });
    } catch (error) {
      const mapped = toGenerationError(error);
      console.error(`[ai] ${mapped.kind}`, { model: this.model.id, error });
      return err(mapped);
    }
  }
}
