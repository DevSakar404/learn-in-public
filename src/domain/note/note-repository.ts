import type { Result } from "../shared/result";
import type { Note, NoteStatus } from "./note";

export interface NoteFilter {
  status?: NoteStatus;
  topicId?: string;
  limit?: number;
}

export interface NewNote {
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  topicId: string;
  videoUrl: string | null;
}

export type NotePatch = Partial<Omit<NewNote, "slug">> & {
  status?: NoteStatus;
  publishedAt?: Date | null;
};

export interface INoteReader {
  /** Newest first: published_at desc (drafts last), then created_at desc. */
  list(filter?: NoteFilter): Promise<Note[]>;
  findById(id: string): Promise<Result<Note>>;
  findBySlug(slug: string): Promise<Result<Note>>;
  slugExists(slug: string): Promise<boolean>;
}

export interface INoteWriter {
  create(data: NewNote): Promise<Result<Note>>;
  update(id: string, patch: NotePatch): Promise<Result<Note>>;
  delete(id: string): Promise<Result<void>>;
}
