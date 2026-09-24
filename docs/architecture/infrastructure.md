# Layer: infrastructure (`src/infrastructure/`)

**Purpose:** concrete adapters that implement domain interfaces: Supabase, Mastra, env, clock, auth helpers.

**May import:** `domain/`, `application/` (for strategy types), Supabase, Mastra, Next server APIs (`cookies`).
**Must not import:** `lib`, `app`, `components`.

## Folder map
```
infrastructure/
  config/env.ts            Zod-validated, server-only env (getEnv)
  supabase/server-client.ts   createServerClient (cookie session, admin pages/actions)
            public-client.ts  cookie-less publishable-key client (public pages, so they stay static)
            database.types.ts generated; never edit by hand
  repositories/            Supabase<Name>Repository + mappers.ts (row ↔ entity)
  ai/                      MastraContentGenerator · model-provider.ts (LLM_PROVIDER → model)
  auth/                    requireAdmin() · isAdmin(user)
  system-clock.ts
```

## Rules
- **Only this layer imports `@supabase/*` and `@mastra/*`.**
- Repositories map rows to entities in `mappers.ts`. Domain code never sees `Database["public"]["Tables"]…`.
- Repositories translate DB errors into domain errors (e.g. unique violation `23505` → `ConflictError`).
- Repositories **must behave exactly like the in-memory fakes** (Liskov). The shared contract tests prove it (see [testing.md](testing.md)).
- `MastraContentGenerator` maps failures: abort → `timeout`, HTTP 429 → `rate_limit`, Zod fail → `invalid_output` (and logs the raw output), anything else → `provider`.
- The Supabase **secret key** is never read here. Only `scripts/` uses it.

## Admin check
`isAdmin(user)` = `user.app_metadata.role === "admin"`. The same rule exists in RLS (`auth.jwt() -> 'app_metadata' ->> 'role'`), see [database.md](database.md).
