import type {
  GenerationOutput,
  GenerationRequest,
  IContentGenerator,
} from "@/domain/post/content-generator";
import type { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";

/** Returns canned content per call, or a chosen GenerationError. Records every request. */
export class FakeContentGenerator implements IContentGenerator {
  readonly requests: GenerationRequest<unknown>[] = [];
  failWith: GenerationError | null = null;

  constructor(private readonly respond: (request: GenerationRequest<unknown>) => unknown) {}

  async generate<T>(
    request: GenerationRequest<T>,
  ): Promise<Result<GenerationOutput<T>, GenerationError>> {
    this.requests.push(request as GenerationRequest<unknown>);
    if (this.failWith) return err(this.failWith);
    const parsed = request.schema.parse(this.respond(request as GenerationRequest<unknown>));
    return ok({
      content: parsed,
      modelUsed: "fake-model-1",
      usage: { inputTokens: 10, outputTokens: 20, latencyMs: 5 },
    });
  }
}
