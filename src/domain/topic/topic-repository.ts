import type { Result } from "../shared/result";
import type { Topic } from "./topic";

export interface NewTopic {
  name: string;
  slug: string;
  description: string;
}

export interface ITopicReader {
  list(): Promise<Topic[]>;
  findById(id: string): Promise<Result<Topic>>;
  findBySlug(slug: string): Promise<Result<Topic>>;
  slugExists(slug: string): Promise<boolean>;
}

export interface ITopicWriter {
  create(data: NewTopic): Promise<Result<Topic>>;
  update(id: string, data: Omit<NewTopic, "slug">): Promise<Result<Topic>>;
  /** ConflictError while notes still reference the topic. */
  delete(id: string): Promise<Result<void>>;
}
