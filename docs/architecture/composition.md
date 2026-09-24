# Composition root (`src/lib/`)

**Purpose:** `lib/container.ts` is the only place that instantiates concrete classes (Dependency Inversion). `lib/` also holds tiny shared utils (`utils.ts` → `cn`, `csv.ts`).

**Who may import the container:** `app/` only (pages, layouts, server actions, route handlers). Components get data through props instead. The container is `server-only`.

## The pattern

```ts
import "server-only";

const clock: IClock = new SystemClock(); // stateless → one instance
const strategies = defaultStrategies();

export const container = {
  config: () => ({ siteUrl, timeZone }),
  auth: async () => new SupabaseAuthGateway(await createSupabaseServerClient()),
  // Cookie session → admin pages/actions (dynamic routes)
  admin: {
    notes: async () => noteService(await createSupabaseServerClient()),
    generation: async () => new ContentGenerationService(/* repos */, contentGenerator(), strategies),
    // topics, posts, subscribers, dashboard …
  },
  // Cookie-less client → public pages stay statically generated
  public: { notes: () => noteService(createSupabasePublicClient()), topics, subscribers },
};
```

Usage in the app layer: `await (await container.admin.notes()).publish(id)` or `container.public.notes().listPublished()`.
The test-side twin is `test/fakes/setup.ts`: the same wiring with in-memory fakes.

## How to add a dependency

1. The interface lives in `domain/`, the implementation in `infrastructure/`.
2. Construct it here and pass it into the service constructor.
3. Tests do the same with fakes (see [testing.md](testing.md)). No other file changes.
