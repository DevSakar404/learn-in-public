import { z } from "zod";
import type { Topic } from "@/domain/topic/topic";
import type { ITopicReader, ITopicWriter } from "@/domain/topic/topic-repository";
import type { Result } from "@/domain/shared/result";
import type { SlugService } from "./slug-service";

export const topicInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(300).default(""),
});
export type TopicInput = z.output<typeof topicInputSchema>;

export class TopicService {
  constructor(
    private readonly reader: ITopicReader,
    private readonly writer: ITopicWriter,
    private readonly slugs: SlugService,
  ) {}

  list(): Promise<Topic[]> {
    return this.reader.list();
  }

  getBySlug(slug: string): Promise<Result<Topic>> {
    return this.reader.findBySlug(slug);
  }

  /** The slug is set once from the name and never changes, so URLs stay stable. */
  async create(input: TopicInput): Promise<Result<Topic>> {
    const slug = await this.slugs.unique(input.name, (s) => this.reader.slugExists(s));
    return this.writer.create({ ...input, slug });
  }

  update(id: string, input: TopicInput): Promise<Result<Topic>> {
    return this.writer.update(id, input);
  }

  delete(id: string): Promise<Result<void>> {
    return this.writer.delete(id);
  }
}
