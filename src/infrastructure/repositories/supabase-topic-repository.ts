import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Topic } from "@/domain/topic/topic";
import type { ITopicReader, ITopicWriter, NewTopic } from "@/domain/topic/topic-repository";
import type { Db } from "../supabase/server-client";
import { rowsOrThrow, throwOnError, toDomainError } from "./db-errors";
import { toTopic } from "./mappers";

export class SupabaseTopicRepository implements ITopicReader, ITopicWriter {
  constructor(private readonly db: Db) {}

  async list(): Promise<Topic[]> {
    return rowsOrThrow(await this.db.from("topics").select().order("name"), "List topics").map(
      toTopic,
    );
  }

  async findById(id: string): Promise<Result<Topic>> {
    const row = throwOnError(
      await this.db.from("topics").select().eq("id", id).maybeSingle(),
      "Find topic",
    );
    return row ? ok(toTopic(row)) : err(new NotFoundError("Topic", id));
  }

  async findBySlug(slug: string): Promise<Result<Topic>> {
    const row = throwOnError(
      await this.db.from("topics").select().eq("slug", slug).maybeSingle(),
      "Find topic",
    );
    return row ? ok(toTopic(row)) : err(new NotFoundError("Topic", slug));
  }

  async slugExists(slug: string): Promise<boolean> {
    const { count, error } = await this.db
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    if (error) throw new Error(`Check topic slug failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async create(data: NewTopic): Promise<Result<Topic>> {
    const { data: row, error } = await this.db.from("topics").insert(data).select().single();
    return error ? err(toDomainError(error, "topic", "write")) : ok(toTopic(row));
  }

  async update(id: string, data: Omit<NewTopic, "slug">): Promise<Result<Topic>> {
    const { data: row, error } = await this.db
      .from("topics")
      .update(data)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return err(toDomainError(error, "topic", "write"));
    return row ? ok(toTopic(row)) : err(new NotFoundError("Topic", id));
  }

  async delete(id: string): Promise<Result<void>> {
    const { data, error } = await this.db.from("topics").delete().eq("id", id).select("id");
    if (error) return err(toDomainError(error, "topic", "delete"));
    return data.length ? ok(undefined) : err(new NotFoundError("Topic", id));
  }
}
