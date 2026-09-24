# Layer: application (`src/application/`)

**Purpose:** use cases. One class per responsibility, and all business rules live here.

**May import:** `domain/` only.
**Must not import:** `infrastructure`, `lib`, `app`, `components`, Next, React, Supabase, Mastra.

## Services

| Class                      | Job                                                          | Constructor takes                                                                    |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `SlugService`              | slugify + make unique (`unique(text, exists)`)               | nothing (stateless)                                                                  |
| `TopicService`             | topic CRUD                                                   | `ITopicReader`, `ITopicWriter`, `SlugService`                                        |
| `NoteService`              | note lifecycle (create/update/publish/unpublish/delete/list) | `INoteReader`, `INoteWriter`, `SlugService`, `IClock`                                |
| `PostService`              | edit a draft, status transitions, posted URL                 | `IPostReader`, `IPostWriter`                                                         |
| `ContentGenerationService` | generate or regenerate drafts per platform                   | `INoteReader`, `IPostReader`, `IPostWriter`, `IContentGenerator`, `StrategyRegistry` |
| `SubscriberService`        | subscribe (idempotent), list, CSV rows                       | `ISubscriberReader`, `ISubscriberWriter`                                             |
| `DashboardService`         | counts + streak                                              | readers, `IClock`, time zone                                                         |

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

`application/content/strategies/*-strategy.ts` extend `PromptStrategy<P>`, which implements `IPlatformContentStrategy`: `platform`, `schema` (the platform's Zod schema from `domain/post/post.ts`), `promptVersion` (`x.v1+voice.v1`), `buildPrompt(note)`.
Prompts live in `application/content/prompts/*.v1.ts`, adapted from the agency-agents marketing personas (the source is named at the top of each file). Order: shared voice → platform instructions → note (last, for prompt caching).

**Add a platform:** add a schema to `platformContentSchemas` → write a prompt file + a strategy class → register it in `defaultStrategies()` → add the enum value in a migration. No existing strategy changes.

**Change a prompt:** copy it to `*.v2.ts`, point the strategy at it, and run the eval set (see [03-tech-debt.md](../03-tech-debt.md) #0). Old drafts keep their recorded version.
