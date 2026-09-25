import type { IClock } from "@/domain/clock";
import { z } from "zod";
import { platformContentSchemas, POST_STATUSES, type AnyPost } from "@/domain/post/post";
import type { IPostReader, IPostWriter, PostPatch } from "@/domain/post/post-repository";
import { ValidationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";

export const postUpdateSchema = z.object({
  content: z.unknown().optional(),
  status: z.enum(POST_STATUSES).optional(),
  postedUrl: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(z.url("Must be a full URL").nullable())
    .optional(),
});
export type PostUpdate = z.output<typeof postUpdateSchema>;

export class PostService {
  constructor(
    private readonly reader: IPostReader,
    private readonly writer: IPostWriter,
    private readonly clock: IClock,
  ) {}

  get(id: string): Promise<Result<AnyPost>> {
    return this.reader.findById(id);
  }

  listForNote(noteId: string): Promise<AnyPost[]> {
    return this.reader.listByNote(noteId);
  }

  /** Edited content is re-validated against the platform's schema before it's saved. */
  async update(id: string, update: PostUpdate): Promise<Result<AnyPost>> {
    const found = await this.reader.findById(id);
    if (!found.ok) return found;

    const patch: PostPatch = { status: update.status, postedUrl: update.postedUrl };
    // The planner needs *when* something was posted: stamp it on the transition, clear it on the way back.
    if (update.status === "posted" && found.value.status !== "posted")
      patch.postedAt = this.clock.now();
    if (update.status && update.status !== "posted") patch.postedAt = null;
    if (update.content !== undefined) {
      const parsed = platformContentSchemas[found.value.platform].safeParse(update.content);
      if (!parsed.success) {
        return err(
          new ValidationError(`Draft doesn't fit the format: ${z.prettifyError(parsed.error)}`),
        );
      }
      patch.content = parsed.data;
    }
    return this.writer.update(id, patch);
  }
}
