@AGENTS.md

# Learn in Public: blog + content studio

One admin writes daily AI-engineering notes → public blog → AI drafts social posts → admin reviews and copies them.
Product and feature list: [docs/00-overview.md](docs/00-overview.md).

## Hard rules
1. **Layers:** `domain ← application ← infrastructure ← lib (container) ← app ← components`. Inner layers never import outer ones. ESLint enforces this (`eslint.config.mjs`).
2. **Routes and server actions are thin:** Zod-parse → `requireAdmin()` (admin actions) → service from `@/lib/container` → return. No business logic in `app/` or `components/`.
3. **Services return `Result<T, DomainError>`** (`src/domain/shared/result.ts`) for expected failures. They never throw them.
4. **Every boundary is validated with Zod:** forms, action args, env, LLM output.
5. **No `any`.** `strict` + `noUncheckedIndexedAccess` are on.
6. **No secrets on the client.** Env is server-only (`src/infrastructure/config/env.ts`). The service/secret key is used only by `scripts/`.
7. **Only `src/infrastructure/ai/*` may import Mastra. Only `src/infrastructure/**` may import Supabase.**
8. One fact, one home: update the doc that owns a fact instead of repeating it elsewhere.

## Commands
| Task | Command |
|---|---|
| Dev server | `pnpm dev` |
| Checks (must pass every phase) | `pnpm lint && pnpm typecheck && pnpm test` |
| Format | `pnpm format` |
| Local DB | `supabase start` / `supabase stop` / `supabase db reset` |
| DB types | `supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts` |

## Doc map: working on X → read Y
| Working on | Read |
|---|---|
| How a request flows | [docs/01-workflows.md](docs/01-workflows.md) |
| Why something was chosen | [docs/02-decisions.md](docs/02-decisions.md) |
| Deferred work / v2 | [docs/03-tech-debt.md](docs/03-tech-debt.md) |
| Entities, interfaces, errors | [docs/architecture/domain.md](docs/architecture/domain.md) |
| Services, strategies | [docs/architecture/application.md](docs/architecture/application.md) |
| Supabase repos, Mastra, env, auth | [docs/architecture/infrastructure.md](docs/architecture/infrastructure.md) |
| Wiring a new dependency | [docs/architecture/composition.md](docs/architecture/composition.md) |
| Routes, actions, proxy, caching | [docs/architecture/app-layer.md](docs/architecture/app-layer.md) |
| Components, a11y, dark mode | [docs/architecture/ui.md](docs/architecture/ui.md) |
| Schema, RLS, migrations | [docs/architecture/database.md](docs/architecture/database.md) |
| Tests and fakes | [docs/architecture/testing.md](docs/architecture/testing.md) |
| A specific feature | `docs/features/F*.md` |

## Conventions
- Files are `kebab-case.ts`. Classes are `PascalCase`. Interfaces start with `I` (`INoteReader`).
- Next.js 16: request interception lives in `src/proxy.ts` (formerly middleware).
- Commits are small, with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- At the end of each phase: checks green → update the feature doc's "Done when" → summarise → wait for approval.
