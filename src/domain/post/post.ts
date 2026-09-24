import { z } from "zod";

export const PLATFORMS = ["x", "linkedin", "instagram", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};

export const POST_STATUSES = ["draft", "approved", "posted"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** X counts URLs and emoji as more than their length; 270 leaves a safety margin. */
export const TWEET_MAX = 270;
const tweet = z.string().trim().min(1).max(TWEET_MAX);

/** One output schema per platform. Used for LLM structured output and to validate edits. */
export const platformContentSchemas = {
  x: z.object({
    post: tweet.describe("A single standalone post"),
    thread: z.array(tweet).max(8).describe("Optional follow-up tweets; empty if not needed"),
  }),
  linkedin: z.object({
    hook: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("First line that makes people click 'see more'"),
    body: z.string().trim().min(1).max(2500).describe("A short story or insight from the note"),
    question: z.string().trim().min(1).max(250).describe("A closing question inviting replies"),
  }),
  instagram: z.object({
    slides: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(60),
          body: z.string().trim().min(1).max(220),
        }),
      )
      .min(6)
      .max(8),
    caption: z.string().trim().min(1).max(2000),
    hashtags: z
      .array(
        z
          .string()
          .trim()
          .regex(/^#\w+$/),
      )
      .min(3)
      .max(10),
  }),
  youtube: z.object({
    titleOptions: z.array(z.string().trim().min(1).max(100)).min(3).max(5),
    outline: z
      .array(z.string().trim().min(1))
      .min(3)
      .max(12)
      .describe("Script outline, one beat per item"),
    description: z.string().trim().min(1).max(4000),
  }),
} satisfies Record<Platform, z.ZodType>;

export type PlatformContent = {
  [P in Platform]: z.infer<(typeof platformContentSchemas)[P]>;
};

export interface GenerationUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

export interface Post<P extends Platform = Platform> {
  id: string;
  noteId: string;
  platform: P;
  content: PlatformContent[P];
  status: PostStatus;
  postedUrl: string | null;
  modelUsed: string;
  promptVersion: string;
  usage: GenerationUsage | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A post of any platform, discriminated on `platform`. */
export type AnyPost = { [P in Platform]: Post<P> }[Platform];

/** Just the platform + its content, discriminated on `platform`. */
export type PlatformPayload = {
  [P in Platform]: { platform: P; content: PlatformContent[P] };
}[Platform];

/** Drafts the admin has signed off on are never overwritten by a regenerate. */
export const isLocked = (post: Pick<Post, "status">) => post.status !== "draft";
