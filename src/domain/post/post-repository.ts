import type { Result } from "../shared/result";
import type { AnyPost, GenerationUsage, Platform, PlatformContent, PostStatus } from "./post";

export interface DraftData<P extends Platform = Platform> {
  noteId: string;
  platform: P;
  content: PlatformContent[P];
  modelUsed: string;
  promptVersion: string;
  usage: GenerationUsage;
}

export interface PostPatch {
  content?: unknown;
  status?: PostStatus;
  postedUrl?: string | null;
}

export interface IPostReader {
  listByNote(noteId: string): Promise<AnyPost[]>;
  findById(id: string): Promise<Result<AnyPost>>;
  countByStatus(): Promise<Record<PostStatus, number>>;
}

export interface IPostWriter {
  /** Insert or replace the draft for (noteId, platform); resets status to draft. */
  upsertDraft<P extends Platform>(data: DraftData<P>): Promise<Result<AnyPost>>;
  /** `content` must already be validated against the platform schema. */
  update(id: string, patch: PostPatch): Promise<Result<AnyPost>>;
}
