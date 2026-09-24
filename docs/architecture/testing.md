# Testing (Vitest)

**Command:** `pnpm test` (runs once) · `pnpm test:watch`.
Tests sit next to the code (`*.test.ts`). Shared fakes live in `test/fakes/`, contract suites in `test/contracts/`.

## What must be tested

- **Every application service**, using in-memory fakes. This also proves the DI wiring works.
- Every Zod schema (forms, env, per-platform LLM output).
- Slug logic, streak logic, CSV escaping.
- Components and routes: no unit tests. Business logic doesn't live there.

## Fakes (`test/fakes/`)

| File                        | What                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `in-memory-store.ts`        | `InMemoryStore` + `InMemory{Topic,Note,Post,Subscriber}Repository`. They share one store, so foreign keys and cascades behave like Postgres. |
| `fake-content-generator.ts` | Replaces `MastraContentGenerator`: canned output (validated by the request's schema) or a chosen `GenerationError` via `failWith`            |
| `fixed-clock.ts`            | Replaces `SystemClock`                                                                                                                       |
| `setup.ts`                  | The test composition root: `setup()` returns every service wired to fakes, plus `seedNote()`                                                 |
| `sample-content.ts`         | One valid sample per platform                                                                                                                |

## Liskov contract tests

`test/contracts/note-repository.contract.ts` exports `runNoteRepositoryContract(make)`. It always runs against the in-memory repos. `pnpm test:db` also runs it against local Supabase (secret key, test-only), cleaning up after itself. If a fake and the real repo disagree, the contract fails.

## Integration tests against local Supabase (`pnpm test:db`)

Unit tests use fakes, so they can't see `supabase/config.toml`, RLS or the auth server. `test/contracts/` covers that:

- `note-repository.test.ts`: the repository contract (above).
- `auth.test.ts`: real sign-in through `SupabaseAuthGateway` (admin OK, wrong password, non-admin rejected) and sign-ups disabled. Added after `[auth.email] enable_signup = false` silently disabled email logins; with that config, 3 of its tests fail.

Run `pnpm test:db` whenever you touch migrations, RLS, `supabase/config.toml` or anything in `src/infrastructure/`.

## Style

Assert on behaviour and `Result` values, not on implementation details. No snapshot tests of LLM output. Test the schemas and the error mapping instead.
