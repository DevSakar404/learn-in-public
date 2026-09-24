import type { Note } from "@/domain/note/note";
import type { INoteReader } from "@/domain/note/note-repository";
import type { IContentGenerator } from "@/domain/post/content-generator";
import { isLocked, PLATFORM_LABELS, type AnyPost, type Platform } from "@/domain/post/post";
import type { IPostReader, IPostWriter } from "@/domain/post/post-repository";
import { ConflictError, GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { StrategyRegistry } from "./content/strategies/registry";

export interface PlatformOutcome {
  platform: Platform;
  result: Result<AnyPost>;
}

export class ContentGenerationService {
  constructor(
    private readonly notes: INoteReader,
    private readonly postReader: IPostReader,
    private readonly postWriter: IPostWriter,
    private readonly generator: IContentGenerator,
    private readonly strategies: StrategyRegistry,
  ) {}

  /** Generates each platform in parallel; one platform failing never affects the others. */
  async generate(
    noteId: string,
    platforms: readonly Platform[],
  ): Promise<Result<PlatformOutcome[]>> {
    const note = await this.notes.findById(noteId);
    if (!note.ok) return note;
    const existing = await this.postReader.listByNote(noteId);

    const settled = await Promise.allSettled(
      platforms.map((p) =>
        this.generateOne(
          note.value,
          p,
          existing.find((e) => e.platform === p),
        ),
      ),
    );
    return ok(
      settled.map((s, i) => ({
        platform: platforms[i]!,
        result:
          s.status === "fulfilled"
            ? s.value
            : err(
                new GenerationError(
                  "provider",
                  s.reason instanceof Error ? s.reason.message : "Unexpected error",
                ),
              ),
      })),
    );
  }

  private async generateOne(
    note: Note,
    platform: Platform,
    existing?: AnyPost,
  ): Promise<Result<AnyPost>> {
    if (existing && isLocked(existing)) {
      return err(
        new ConflictError(
          `${PLATFORM_LABELS[platform]} draft is ${existing.status}. Set it back to draft to regenerate.`,
        ),
      );
    }
    const strategy = this.strategies.get(platform);
    const output = await this.generator.generate({
      ...strategy.buildPrompt(note),
      schema: strategy.schema,
    });
    if (!output.ok) return output;
    return this.postWriter.upsertDraft({
      noteId: note.id,
      platform,
      content: output.value.content,
      modelUsed: output.value.modelUsed,
      promptVersion: strategy.promptVersion,
      usage: output.value.usage,
    });
  }
}
