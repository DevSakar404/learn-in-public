# Database (`supabase/`)

**Source of truth:** SQL files in `supabase/migrations/`. Generated types go to `src/infrastructure/supabase/database.types.ts`.

## Tables

| Table         | Key columns                                                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topics`      | id, name, slug (unique), description, created_at                                                                                                                                                         |
| `notes`       | id, title, slug (unique), summary, content_md, topic_id → topics, video_url?, status `note_status`, published_at?, created_at, updated_at                                                                |
| `posts`       | id, note_id → notes (cascade), platform `platform`, content **jsonb**, status `post_status`, posted_url?, model_used, prompt_version, usage jsonb, created_at, updated_at, **unique(note_id, platform)** |
| `subscribers` | id, email (unique, lower-cased), status `subscriber_status`, created_at                                                                                                                                  |

Enums: `note_status (draft, published)`, `post_status (draft, approved, posted)`, `platform (x, linkedin, instagram, youtube)`, `subscriber_status (active, unsubscribed)`.
Triggers: `updated_at` on notes and posts. Indexes: slugs, `notes(status, published_at desc)`, `notes(topic_id)`, `posts(note_id)`.

## RLS matrix (enabled on every table)

| Table       | anon / authenticated non-admin      | admin (`auth.jwt()->'app_metadata'->>'role' = 'admin'`) |
| ----------- | ----------------------------------- | ------------------------------------------------------- |
| topics      | select                              | all                                                     |
| notes       | select where `status = 'published'` | all                                                     |
| posts       | none                                | all                                                     |
| subscribers | insert only                         | all                                                     |

## Workflow

```bash
supabase migration new <name>          # write SQL
supabase db reset                      # re-apply all migrations + seed locally
supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts
```

Production: `supabase link` then `supabase db push`. Disable sign-ups in the dashboard (see [F1](../features/F1-admin-auth.md)).
