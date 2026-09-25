import type { AnyPost, Platform, PostStatus } from "@/domain/post/post";
import type { DraftData, IPostReader, IPostWriter, PostPatch } from "@/domain/post/post-repository";
import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Json, TablesUpdate } from "../supabase/database.types";
import type { Db } from "../supabase/server-client";
import { rowsOrThrow, throwOnError, toDomainError } from "./db-errors";
import { toPost } from "./mappers";

export class SupabasePostRepository implements IPostReader, IPostWriter {
  constructor(private readonly db: Db) {}

  async listByNote(noteId: string): Promise<AnyPost[]> {
    return rowsOrThrow(
      await this.db.from("posts").select().eq("note_id", noteId),
      "List posts",
    ).map(toPost);
  }

  async findById(id: string): Promise<Result<AnyPost>> {
    const row = throwOnError(
      await this.db.from("posts").select().eq("id", id).maybeSingle(),
      "Find post",
    );
    return row ? ok(toPost(row)) : err(new NotFoundError("Post", id));
  }

  async countByStatus(): Promise<Record<PostStatus, number>> {
    const rows = rowsOrThrow(await this.db.from("posts").select("status"), "Count posts");
    const counts: Record<PostStatus, number> = { draft: 0, approved: 0, posted: 0 };
    for (const r of rows) counts[r.status]++;
    return counts;
  }

  async listPostedSince(since: Date): Promise<AnyPost[]> {
    const rows = rowsOrThrow(
      await this.db.from("posts").select().gte("posted_at", since.toISOString()),
      "List posted drafts",
    );
    return rows.map(toPost);
  }

  async upsertDraft<P extends Platform>(data: DraftData<P>): Promise<Result<AnyPost>> {
    const { data: row, error } = await this.db
      .from("posts")
      .upsert(
        {
          note_id: data.noteId,
          platform: data.platform,
          content: data.content as Json,
          model_used: data.modelUsed,
          prompt_version: data.promptVersion,
          usage: { ...data.usage },
          status: "draft",
          posted_url: null,
          posted_at: null,
        },
        { onConflict: "note_id,platform" },
      )
      .select()
      .single();
    return error ? err(toDomainError(error, "draft", "write")) : ok(toPost(row));
  }

  async update(id: string, patch: PostPatch): Promise<Result<AnyPost>> {
    const row: TablesUpdate<"posts"> = {
      content: patch.content as Json | undefined,
      status: patch.status,
      posted_url: patch.postedUrl,
      posted_at: patch.postedAt === undefined ? undefined : (patch.postedAt?.toISOString() ?? null),
    };
    const { data, error } = await this.db
      .from("posts")
      .update(row)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return err(toDomainError(error, "draft", "write"));
    return data ? ok(toPost(data)) : err(new NotFoundError("Post", id));
  }
}
