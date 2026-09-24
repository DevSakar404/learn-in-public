# Testing (Vitest)

**Command:** `pnpm test` (runs once) · `pnpm test:watch`.
Tests sit next to the code (`*.test.ts`). Shared fakes live in `test/fakes/`, contract suites in `test/contracts/`.

## What must be tested
- **Every application service**, using in-memory fakes. This also proves the DI wiring works.
- Every Zod schema (forms, env, per-platform LLM output).
- Slug logic, streak logic, CSV escaping.
- Components and routes: no unit tests. Business logic doesn't live there.

## Fakes
| Fake | Replaces |
|---|---|
| `InMemoryNoteRepository` (etc.) | `Supabase*Repository` (implements the same reader + writer interfaces) |
| `FakeContentGenerator` | `MastraContentGenerator` (returns canned output or a chosen `GenerationError`) |
| `FixedClock` | `SystemClock` |

## Liskov contract tests
`test/contracts/note-repository.contract.ts` exports `runNoteRepositoryContract(makeRepo)`. It runs against the in-memory repo always, and against Supabase when `SUPABASE_TEST=1` (local DB running). If a fake and the real repo disagree, the contract fails.

## Style
Assert on behaviour and `Result` values, not on implementation details. No snapshot tests of LLM output. Test the schemas and the error mapping instead.
