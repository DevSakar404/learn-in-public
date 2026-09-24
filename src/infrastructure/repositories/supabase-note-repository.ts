import type { Note } from "@/domain/note/note";
import type {
  INoteReader,
  INoteWriter,
  NewNote,
  NoteFilter,
  NotePatch,
} from "@/domain/note/note-repository";
import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { TablesUpdate } from "../supabase/database.types";
import type { Db } from "../supabase/server-client";
import { rowsOrThrow, throwOnError, toDomainError } from "./db-errors";
import { NOTE_SELECT, toNote } from "./mappers";

export class SupabaseNoteRepository implements INoteReader, INoteWriter {
  constructor(private readonly db: Db) {}

  async list(filter: NoteFilter = {}): Promise<Note[]> {
    let query = this.db
      .from("notes")
      .select(NOTE_SELECT)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (filter.status) query = query.eq("status", filter.status);
    if (filter.topicId) query = query.eq("topic_id", filter.topicId);
    if (filter.limit) query = query.limit(filter.limit);
    return rowsOrThrow(await query, "List notes").map(toNote);
  }

  async findById(id: string): Promise<Result<Note>> {
    const row = throwOnError(
      await this.db.from("notes").select(NOTE_SELECT).eq("id", id).maybeSingle(),
      "Find note",
    );
    return row ? ok(toNote(row)) : err(new NotFoundError("Note", id));
  }

  async findBySlug(slug: string): Promise<Result<Note>> {
    const row = throwOnError(
      await this.db.from("notes").select(NOTE_SELECT).eq("slug", slug).maybeSingle(),
      "Find note",
    );
    return row ? ok(toNote(row)) : err(new NotFoundError("Note", slug));
  }

  async slugExists(slug: string): Promise<boolean> {
    const { count, error } = await this.db
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    if (error) throw new Error(`Check note slug failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async create(data: NewNote): Promise<Result<Note>> {
    const { data: row, error } = await this.db
      .from("notes")
      .insert({
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        content_md: data.contentMd,
        topic_id: data.topicId,
        video_url: data.videoUrl,
      })
      .select(NOTE_SELECT)
      .single();
    return error ? err(toDomainError(error, "note", "write")) : ok(toNote(row));
  }

  async update(id: string, patch: NotePatch): Promise<Result<Note>> {
    const row: TablesUpdate<"notes"> = {
      title: patch.title,
      summary: patch.summary,
      content_md: patch.contentMd,
      topic_id: patch.topicId,
      video_url: patch.videoUrl,
      status: patch.status,
      published_at:
        patch.publishedAt === undefined ? undefined : (patch.publishedAt?.toISOString() ?? null),
    };
    const { data, error } = await this.db
      .from("notes")
      .update(row)
      .eq("id", id)
      .select(NOTE_SELECT)
      .maybeSingle();
    if (error) return err(toDomainError(error, "note", "write"));
    return data ? ok(toNote(data)) : err(new NotFoundError("Note", id));
  }

  async delete(id: string): Promise<Result<void>> {
    const { data, error } = await this.db.from("notes").delete().eq("id", id).select("id");
    if (error) return err(toDomainError(error, "note", "delete"));
    return data.length ? ok(undefined) : err(new NotFoundError("Note", id));
  }
}
