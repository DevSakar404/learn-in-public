# F2: Topics · Phase 2

**Goal:** the admin groups notes into topics.

**Stories:** create, edit, delete a topic at `/admin/topics`. Visitors browse `/blog/topic/[topicSlug]`.

**Files by layer:** domain `topic/` · application `TopicService`, `SlugService` · infra `SupabaseTopicRepository` · app `admin/topics/`, `actions/topics.ts`

**Rules**

- The slug is generated from the name and made unique (`-2`, `-3` suffixes).
- A topic that still has notes can't be deleted → `ConflictError` with a clear message.

**Done when**

- [ ] CRUD works with validation errors shown inline.
- [ ] `TopicService` + `SlugService` are unit-tested.
