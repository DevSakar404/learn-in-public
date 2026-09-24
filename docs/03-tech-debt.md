# Tech debt and v2 backlog

The single home for deferred work. In code, deliberate shortcuts are marked with a `ponytail:` comment that names the limit.

## v2, highest priority first

| #   | Item                                                                                                                                                                                                                | Why                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0   | **Eval harness** `pnpm eval`: 10 real notes × 4 platforms. Code checks (schema, lengths, slide/hashtag counts, first person, emoji limit, banned hype words) + an LLM judge for "every claim is backed by the note" | Prompt changes are guesses without it. Build once ~10 real notes exist. |
| 0a  | Few-shot voice memory: include 2–3 previously posted drafts in the prompt                                                                                                                                           | "Sounds like me" without an agent memory store.                         |
| 0b  | Auto repair retry (feed the Zod error back once) · input size cap · exact X character counting (URLs = 23)                                                                                                          | The MVP relies on manual Retry and a 270-character margin.              |
| 1   | Background generation (pgmq / Inngest / Vercel Workflow) + streaming progress                                                                                                                                       | A synchronous action can time out and blocks the UI.                    |
| 2   | Rate-limit resilience: backoff with `retry-after`, a concurrency cap, fallback to OpenAI on a Gemini 429                                                                                                            | The free tier has a low requests-per-minute limit.                      |
| 3   | Input-hash skip: no LLM call when the note and prompt version are unchanged                                                                                                                                         | Saves tokens.                                                           |
| 4   | Explicit context caching (Gemini `cachedContents`)                                                                                                                                                                  | Guaranteed cache hits for the long system prompt.                       |
| 5   | Single-call multi-platform generation mode                                                                                                                                                                          | Sends the note tokens once.                                             |
| 6   | Tracing (Mastra / Langfuse)                                                                                                                                                                                         | Debug "weird draft" reports.                                            |
| 7   | Per-note cache tags (`'use cache'`, `revalidateTag`)                                                                                                                                                                | Finer invalidation than `revalidatePath`.                               |
| 8   | Render markdown to `content_html` at publish                                                                                                                                                                        | Removes the per-request render cost.                                    |
| 9   | Streak and counts via a SQL view/RPC, plus pagination                                                                                                                                                               | The MVP reads rows into JS. Fine at ~100 notes.                         |
| 10  | Rate-limit signups + Turnstile/BotID                                                                                                                                                                                | The honeypot only stops simple bots.                                    |
| 11  | OG image generation, full-text search                                                                                                                                                                               | Social click-through and discoverability.                               |

## Future features (interfaces are ready)

- `IPublisher` per platform, for auto-posting.
- `INewsletterSender`, for sending emails.
