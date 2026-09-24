import { z } from "zod";
import type { IClock } from "@/domain/clock";
import type { Note } from "@/domain/note/note";
import type { INoteReader, INoteWriter, NoteFilter } from "@/domain/note/note-repository";
import { youtubeVideoId } from "@/domain/note/youtube";
import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { SlugService } from "./slug-service";

export const noteInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z.string().trim().max(500, "Keep the summary under 500 characters").default(""),
  contentMd: z.string().max(100_000).default(""),
  topicId: z.uuid("Choose a topic"),
  videoUrl: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || youtubeVideoId(v) !== null, "Must be a YouTube link")
    .transform((v) => v || null),
});
export type NoteInput = z.output<typeof noteInputSchema>;

export class NoteService {
  constructor(
    private readonly reader: INoteReader,
    private readonly writer: INoteWriter,
    private readonly slugs: SlugService,
    private readonly clock: IClock,
  ) {}

  list(filter?: NoteFilter): Promise<Note[]> {
    return this.reader.list(filter);
  }

  listPublished(filter: Omit<NoteFilter, "status"> = {}): Promise<Note[]> {
    return this.reader.list({ ...filter, status: "published" });
  }

  get(id: string): Promise<Result<Note>> {
    return this.reader.findById(id);
  }

  /** Drafts are NotFound here, even for a client that could read them. */
  async getPublishedBySlug(slug: string): Promise<Result<Note>> {
    const found = await this.reader.findBySlug(slug);
    if (found.ok && found.value.status !== "published") return err(new NotFoundError("Note", slug));
    return found;
  }

  /** New notes start as drafts. The slug is set once from the title so published URLs never change. */
  async create(input: NoteInput): Promise<Result<Note>> {
    const slug = await this.slugs.unique(input.title, (s) => this.reader.slugExists(s));
    return this.writer.create({ ...input, slug });
  }

  update(id: string, input: NoteInput): Promise<Result<Note>> {
    return this.writer.update(id, input);
  }

  /** Idempotent. Keeps the first published date so the streak history is stable. */
  async publish(id: string): Promise<Result<Note>> {
    const found = await this.reader.findById(id);
    if (!found.ok || found.value.status === "published") return found;
    return this.writer.update(id, {
      status: "published",
      publishedAt: found.value.publishedAt ?? this.clock.now(),
    });
  }

  async unpublish(id: string): Promise<Result<Note>> {
    const found = await this.reader.findById(id);
    if (!found.ok || found.value.status === "draft") return found;
    return this.writer.update(id, { status: "draft" });
  }

  /** Returns the deleted note so callers can revalidate its URLs. */
  async delete(id: string): Promise<Result<Note>> {
    const found = await this.reader.findById(id);
    if (!found.ok) return found;
    const deleted = await this.writer.delete(id);
    return deleted.ok ? ok(found.value) : deleted;
  }
}
