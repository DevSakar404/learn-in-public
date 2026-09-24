# Layer: domain (`src/domain/`)

**Purpose:** the language of the app: entities, status/platform unions, domain errors, and the **interfaces** (ports) that outer layers implement. Pure TypeScript.

**May import:** other `domain/` files, `zod`.
**Must not import:** `application`, `infrastructure`, `lib`, `app`, `components`, Next, React, Supabase, Mastra. (ESLint enforces this.)

## Folder map
```
domain/
  shared/      result.ts (Result, ok, err) · errors.ts (DomainError + subclasses)
  clock.ts     IClock
  note/        note.ts (Note, NoteStatus) · note-repository.ts (INoteReader, INoteWriter)
  topic/       topic.ts · topic-repository.ts
  post/        post.ts (Platform, PostStatus, PlatformContent) · post-repository.ts
               content-generator.ts (IContentGenerator) · platform-strategy.ts (IPlatformContentStrategy)
  subscriber/  subscriber.ts · subscriber-repository.ts
```

## The pattern
```ts
export type NoteStatus = "draft" | "published";          // mirrored as a Postgres enum

export interface Note { id: string; title: string; slug: string; status: NoteStatus; /* … */ }

export interface INoteReader {                            // small, read-only port
  findBySlug(slug: string): Promise<Result<Note>>;
}
export interface INoteWriter {                            // separate write port (ISP)
  create(input: NewNote): Promise<Result<Note>>;
}
```
- Entities are plain `interface`s (readonly data). Behaviour lives in services.
- Errors: `NotFoundError`, `ValidationError` (with `fieldErrors`), `ConflictError`, `UnauthorizedError`, and later `GenerationError` (`kind: timeout | rate_limit | invalid_output | provider`). Each has a stable `code`.

## How to add a new entity
1. `domain/<name>/<name>.ts`: the entity + its status union.
2. `domain/<name>/<name>-repository.ts`: `I<Name>Reader` / `I<Name>Writer`, returning `Result`.
3. Add the Postgres enum/table in [database.md](database.md), then implement the repo in [infrastructure.md](infrastructure.md).
