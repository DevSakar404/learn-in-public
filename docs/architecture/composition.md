# Composition root (`src/lib/`)

**Purpose:** `lib/container.ts` is the only place that instantiates concrete classes (Dependency Inversion). `lib/` also holds tiny shared utils (`utils.ts` → `cn`, `csv.ts`).

**Who may import the container:** `app/` only (pages, layouts, server actions, route handlers). Components get data through props instead. The container is `server-only`.

## The pattern
```ts
import "server-only";

const clock: IClock = new SystemClock();          // stateless → a singleton

// Stateful per request (cookie session) → an async factory
export async function adminNoteService() {
  const db = await createSupabaseServerClient();
  const repo = new SupabaseNoteRepository(db);
  return new NoteService(repo, repo, new SlugService((s) => repo.slugExists(s)), clock);
}

// Public pages → cookie-less client, so the route can be statically generated
export function publicNoteService() {
  const repo = new SupabaseNoteRepository(createSupabasePublicClient());
  return new NoteService(repo, repo, new SlugService((s) => repo.slugExists(s)), clock);
}
```

## How to add a dependency
1. The interface lives in `domain/`, the implementation in `infrastructure/`.
2. Construct it here and pass it into the service constructor.
3. Tests do the same with fakes (see [testing.md](testing.md)). No other file changes.
