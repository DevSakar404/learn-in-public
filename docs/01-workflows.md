# Workflows

The single home for diagrams. Other docs link here instead of redrawing them.

## 1. The big picture

```mermaid
flowchart TD
  B[Browser<br/>visitor reads, admin writes] --> N[Next.js app<br/>pages, server actions, admin check]
  N -->|calls a service| S1[Notes] & S2[Topics] & S3[Subscribers] & S4["AI drafts 🏷 LLM"]
  S1 & S2 & S3 --> R[Supabase repositories]
  S4 --> M[Mastra agent<br/>prompt + check output]
  S4 -->|save drafts| R
  R --> DB[(Postgres + RLS)]
  M --> L[Gemini or OpenAI<br/>chosen in env]
```

**In plain words**
1. **The browser only talks to Next.js.** Visitors get cached pages. The admin submits forms that run server actions. The browser never touches the database or the AI directly, so no secrets reach it.
2. **Next.js stays thin.** It checks the input (Zod), confirms the admin, calls one service, and shows the result.
3. **Services hold all the rules** (when a note counts as published, what makes a slug unique). They're plain TypeScript with no frameworks, so they're easy to test.
4. **Only "AI drafts" uses the LLM.** It builds a prompt per platform, asks Mastra for a draft, and checks the reply against a schema before saving it. If a platform times out, hits a rate limit or returns a bad format, only that tab shows an error, with a Retry button.
5. **Storage and AI can be swapped.** Services depend on interfaces, so switching Gemini to OpenAI is an env change, and tests use in-memory fakes.
6. **The database protects itself.** Row Level Security means the public can only read published notes, even if the app has a bug.

## 2. Layer dependencies

```mermaid
flowchart LR
  components --> app[app/ routes + actions]
  app --> lib[lib/container]
  lib --> infrastructure
  lib --> application
  infrastructure --> domain
  application --> domain
```

## 3. Admin server action (e.g. publish a note)

```mermaid
sequenceDiagram
  participant UI as Component (form)
  participant A as Server Action
  participant C as container
  participant S as NoteService
  participant R as SupabaseNoteRepository
  UI->>A: form data
  A->>A: Zod parse + requireAdmin()
  A->>C: noteService()
  A->>S: publish(id)
  S->>R: update(status, published_at)
  R-->>S: Result<Note>
  S-->>A: Result<Note>
  A->>A: revalidatePath(/blog, note, topic)
  A-->>UI: { ok } or { error, fieldErrors }
```

## 4. Visitor reading a note

`GET /blog/[slug]` → cached HTML (ISR) → on a cache miss the Server Component calls `noteService().getPublishedBySlug()` → the repo uses the cookie-less public client → RLS returns only published rows → the `<Markdown>` component renders → the result is cached until the next revalidation.

## 5. Content lifecycle

```mermaid
flowchart LR
  W[Write note: draft] --> P[Publish]
  P --> B[Blog + RSS + sitemap]
  P --> G[Generate drafts]
  G -->|per platform, parallel| X[X] & L[LinkedIn] & I[Instagram] & Y[YouTube]
  X & L & I & Y --> E[Edit + Copy]
  E --> Ap[approved] --> Po[posted + URL]
  G -. timeout / rate limit / invalid output .-> Rt[Retry this platform]
```

Regenerating never overwrites a draft that's `approved` or `posted` (see [F6](features/F6-ai-drafts.md)).
