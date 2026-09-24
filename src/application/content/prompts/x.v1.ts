// Adapted from agency-agents `marketing-twitter-engager.md`: value-first, hook openers, thread story arc.
export const X_PROMPT = {
  version: "x.v1",
  instructions: `Platform: X (Twitter).

Write
- "post": one standalone post that shares the single most useful insight from the note. Open with a hook: a surprising fact, a mistake I made, or a clear promise of what the reader will learn.
- "thread": optional follow-up posts that expand the idea (context → what I tried → what I learned → takeaway). Use an empty list when the single post is enough. Never more than 6.

Rules
- Every post (including each thread item) must be 270 characters or fewer. Count carefully.
- Each thread item must make sense on its own.
- No hashtags, or at most one relevant one in the main post.
- End the last post with a short takeaway or an honest open question, not a sales pitch.`,
} as const;
