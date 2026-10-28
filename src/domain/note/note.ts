import type { TopicRef } from "../topic/topic";

export type NoteStatus = "draft" | "published";
export const NOTE_STATUSES: readonly NoteStatus[] = ["draft", "published"];

export interface Note {
  id: string;
  title: string;
  slug: string;
  summary: string;
  contentMd: string;
  topic: TopicRef;
  videoUrl: string | null;
  /** Minutes for one focused session (reading + playground + exercises). Null → reading time. */
  sessionMinutes: number | null;
  status: NoteStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
