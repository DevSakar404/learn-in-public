# F6: AI drafts · Phase 3

**Goal:** turn a note into platform drafts that the admin reviews, edits, copies and marks as posted.

**Stories**
- On a note's admin page: "Generate drafts" (all or selected platforms) → tabs, one per platform.
- Each tab: an editable draft, a Copy button, a status control (draft → approved → posted), a posted URL field, and "Regenerate".

**Files by layer**
- domain: `post/` (Platform, PostStatus, PlatformContent, `IContentGenerator`, `IPlatformContentStrategy`), `GenerationError`
- application: `ContentGenerationService`, `PostService`, `content/strategies/*`, `content/prompts/*.v1.ts`
- infra: `ai/mastra-content-generator.ts`, `ai/model-provider.ts`, `SupabasePostRepository`
- app/components: `actions/drafts.ts` (`maxDuration = 60`), `draft-tabs.tsx`

**Output schemas (one per strategy)**
| Platform | Shape |
|---|---|
| X | `{ post, thread?: string[] }`, each ≤270 characters |
| LinkedIn | `{ hook, body, question }` |
| Instagram | `{ slides: {title, body}[6..8], caption, hashtags[] }` |
| YouTube | `{ titleOptions[3..5], outline[], description }` |

**Rules**
- Prompts are adapted from agency-agents marketing personas. Voice: first person, learning in public, simple language, no hype, no emoji spam.
- Platforms run in parallel (`Promise.allSettled`), each with `AbortSignal.timeout(45s)`. Each platform has its own `Result`, so a failure only affects its tab, which shows Retry.
- **Never overwrite an `approved` or `posted` draft.** "Generate all" skips them. A direct regenerate returns `ConflictError`.
- Store `model_used` (the resolved ID), `prompt_version`, `usage`. `console.error` the raw output when validation fails.
- Only `infrastructure/ai/*` imports Mastra.

**Done when**
- [ ] `ContentGenerationService` is tested with `FakeContentGenerator`, including timeout / rate_limit / invalid_output and the approved-draft protection.
- [ ] Every strategy schema is tested with valid and invalid samples.
- [ ] Switching `LLM_PROVIDER=openai` works with no code change.
