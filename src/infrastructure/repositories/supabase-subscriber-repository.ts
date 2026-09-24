import { err, ok, type Result } from "@/domain/shared/result";
import type { Subscriber } from "@/domain/subscriber/subscriber";
import type {
  ISubscriberReader,
  ISubscriberWriter,
} from "@/domain/subscriber/subscriber-repository";
import type { Db } from "../supabase/server-client";
import { rowsOrThrow, toDomainError } from "./db-errors";
import { toSubscriber } from "./mappers";

export class SupabaseSubscriberRepository implements ISubscriberReader, ISubscriberWriter {
  constructor(private readonly db: Db) {}

  async list(): Promise<Subscriber[]> {
    const rows = rowsOrThrow(
      await this.db.from("subscribers").select().order("created_at", { ascending: false }),
      "List subscribers",
    );
    return rows.map(toSubscriber);
  }

  /** No `.select()`: the public role may insert but not read, so a duplicate is detected from the unique violation. */
  async add(email: string): Promise<Result<void>> {
    const { error } = await this.db.from("subscribers").insert({ email });
    return error ? err(toDomainError(error, "subscriber", "write")) : ok(undefined);
  }
}
