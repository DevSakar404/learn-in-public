import type { Note } from "@/domain/note/note";
import { platformContentSchemas, type AnyPost, type GenerationUsage } from "@/domain/post/post";
import type { Subscriber } from "@/domain/subscriber/subscriber";
import type { Topic, TopicRef } from "@/domain/topic/topic";
import type { Tables } from "../supabase/database.types";

// Row ↔ entity mapping. The domain never sees database row types.

export const NOTE_SELECT = "*, topic:topics(id, name, slug)" as const;
type NoteRow = Tables<"notes"> & { topic: TopicRef | null };

export const toTopic = (r: Tables<"topics">): Topic => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  createdAt: new Date(r.created_at),
});

export function toNote(r: NoteRow): Note {
  if (!r.topic) throw new Error(`Note ${r.id} has no topic (was it selected with NOTE_SELECT?)`);
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    contentMd: r.content_md,
    topic: r.topic,
    videoUrl: r.video_url,
    status: r.status,
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/** JSONB content is re-validated on read, so a bad row fails loudly instead of breaking the UI later. */
export function toPost(r: Tables<"posts">): AnyPost {
  const parsed = platformContentSchemas[r.platform].safeParse(r.content);
  if (!parsed.success) throw new Error(`Post ${r.id} has invalid ${r.platform} content`);
  return {
    id: r.id,
    noteId: r.note_id,
    platform: r.platform,
    content: parsed.data,
    status: r.status,
    postedUrl: r.posted_url,
    postedAt: r.posted_at ? new Date(r.posted_at) : null,
    modelUsed: r.model_used,
    promptVersion: r.prompt_version,
    usage: (r.usage as GenerationUsage | null) ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  } as AnyPost;
}

export const toSubscriber = (r: Tables<"subscribers">): Subscriber => ({
  id: r.id,
  email: r.email,
  status: r.status,
  createdAt: new Date(r.created_at),
});
