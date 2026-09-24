import { z } from "zod";
import type { Subscriber } from "@/domain/subscriber/subscriber";
import type {
  ISubscriberReader,
  ISubscriberWriter,
} from "@/domain/subscriber/subscriber-repository";
import { ConflictError } from "@/domain/shared/errors";
import { ok, type Result } from "@/domain/shared/result";
import { toCsv } from "./csv";

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().default(""),
});
export type SubscribeInput = z.output<typeof subscribeSchema>;

export type SubscribeOutcome = "subscribed" | "already_subscribed" | "ignored";

export class SubscriberService {
  constructor(
    private readonly reader: ISubscriberReader,
    private readonly writer: ISubscriberWriter,
  ) {}

  /** Bots get a fake success; duplicates are a friendly success, not an error. */
  async subscribe(input: SubscribeInput): Promise<Result<SubscribeOutcome>> {
    if (input.website !== "") return ok("ignored");
    const added = await this.writer.add(input.email);
    if (added.ok) return ok("subscribed");
    if (added.error instanceof ConflictError) return ok("already_subscribed");
    return added;
  }

  list(): Promise<Subscriber[]> {
    return this.reader.list();
  }

  async exportCsv(): Promise<string> {
    const subscribers = await this.reader.list();
    return toCsv([
      ["email", "status", "subscribed_at"],
      ...subscribers.map((s) => [s.email, s.status, s.createdAt.toISOString()]),
    ]);
  }
}
