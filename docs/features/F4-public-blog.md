# F4: Public blog · Phase 2

**Goal:** a fast, readable public blog.

**Pages:** `/` (intro, latest notes, topics, newsletter form) · `/blog` (all, newest first) · `/blog/topic/[topicSlug]` · `/blog/[slug]` (markdown + code highlighting + video).

**Files by layer:** app `(public)/` routes · components `markdown.tsx`, `note-card.tsx`, `youtube-embed.tsx`

**Rules**

- Only published notes appear (RLS enforces this too).
- The YouTube embed is click-to-load: a thumbnail first, then an `iframe` from `youtube-nocookie.com` after a click.
- Pages are statically generated (cookie-less client) and revalidated on mutations.

**Done when**

- [ ] A draft note's URL returns 404 for visitors.
- [ ] Works at 375px width and in dark mode.
