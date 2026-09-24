# Layer: application (`src/application/`)

**Purpose:** use cases. One class per responsibility, and all business rules live here.

**May import:** `domain/` only.
**Must not import:** `infrastructure`, `lib`, `app`, `components`, Next, React, Supabase, Mastra.

## Services
| Class | Job | Constructor takes |
|---|---|---|
| `SlugService` | slugify + make unique | an `exists(slug)` callback |
| `TopicService` | topic CRUD | `ITopicReader`, `ITopicWriter`, `SlugService` |
| `NoteService` | note lifecycle (create/update/publish/unpublish/delete/list) | `INoteReader`, `INoteWriter`, `SlugService`, `IClock` |
| `PostService` | edit a draft, status transitions, posted URL | `IPostReader`, `IPostWriter` |
| `ContentGenerationService` | generate or regenerate drafts per platform | `INoteReader`, `IPostReader`, `IPostWriter`, `IContentGenerator`, `StrategyRegistry` |
| `SubscriberService` | subscribe (idempotent), list, CSV rows | `ISubscriberReader`, `ISubscriberWriter` |
| `DashboardService` | counts + streak | readers, `IClock`, time zone |

## The pattern
```ts
export class NoteService {
  constructor(
    private readonly reader: INoteReader,
    private readonly writer: INoteWriter,
    private readonly slugs: SlugService,
    private readonly clock: IClock,
  ) {}

  async publish(id: string): Promise<Result<Note>> {
    const found = await this.reader.findById(id);
    if (!found.ok) return found;
    return this.writer.update(id, { status: "published", publishedAt: this.clock.now() });
  }
}
```
- Return `Result` for expected failures. Throw only for bugs.
- Services never check auth. The action does that before calling (see [app-layer.md](app-layer.md)).

## Strategies (Open/Closed)
`application/content/strategies/*-strategy.ts` implements `IPlatformContentStrategy`: `platform`, `promptVersion`, `outputSchema` (Zod), `buildPrompt(note)`. Prompts live in `application/content/prompts/*.v1.ts`. Order: shared voice → platform instructions → note (last, for prompt caching).

**Add a platform:** write a new strategy + a prompt file → register it in `strategies/registry.ts` → add the enum value in a migration. No existing strategy changes.
