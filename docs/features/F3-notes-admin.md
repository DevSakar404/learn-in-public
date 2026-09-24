# F3: Notes admin · Phase 2

**Goal:** write, edit and publish daily notes.

**Stories**
- List notes, filtered by status and topic (URL search params).
- Create/edit in a markdown `<textarea>` with a live preview (the same `<Markdown>` as the blog), a topic select, and an optional YouTube URL.
- Publish, unpublish, delete (with an `AlertDialog` confirmation).

**Files by layer:** domain `note/` · application `NoteService` · infra `SupabaseNoteRepository` · app `admin/notes/`, `actions/notes.ts` · components `note-editor.tsx`, `markdown.tsx`

**Rules**
- Publish sets `published_at` the first time only. Unpublish keeps it (so the streak history stays stable).
- `video_url` must be a YouTube URL (`youtube.com/watch?v=` or `youtu.be/`). It's stored as-is and the embed ID is parsed at render time.
- Every mutation revalidates the public paths ([app-layer.md](../architecture/app-layer.md#caching)).

**Done when**
- [ ] The full note lifecycle is unit-tested with fakes.
- [ ] A published note shows up on `/blog` without a redeploy.
