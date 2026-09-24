# Learn in Public

A blog + content studio for learning AI engineering in public. You write a daily note, it's published as a blog post, and an AI agent drafts posts for X, LinkedIn, Instagram and YouTube for you to review.

Stack: Next.js 16 · TypeScript (strict) · Supabase (Postgres, Auth, RLS) · Tailwind + shadcn/ui · Zod · Mastra (Gemini / OpenAI) · Vitest.
Architecture and conventions: [CLAUDE.md](CLAUDE.md) → [docs/](docs/00-overview.md).

## Setup

### 1. Tools (one time)

```bash
corepack enable pnpm
brew install supabase/tap/supabase
brew install --cask orbstack   # or Docker Desktop; open it once so Docker runs
```

### 2. Install and start the local database

```bash
pnpm install
supabase start          # needs Docker; prints local URLs and keys
```

### 3. Environment

```bash
cp .env.example .env.local
supabase status -o env  # copy API_URL → SUPABASE_URL, PUBLISHABLE_KEY, SECRET_KEY
```

Get a free Gemini API key at https://aistudio.google.com/apikey and set `GOOGLE_GENERATIVE_AI_API_KEY`.
The app refuses to start if any required variable is missing or invalid (see `src/infrastructure/config/env.ts`).

### 4. Seed and run

```bash
pnpm seed:admin         # creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD (safe to re-run)
pnpm dev                # http://localhost:3000, admin at /admin
```

## Scripts

| Script                                       | What it does                                       |
| -------------------------------------------- | -------------------------------------------------- |
| `pnpm dev` / `build` / `start`               | Next.js                                            |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Quality checks (all must pass)                     |
| `pnpm format`                                | Prettier                                           |
| `pnpm seed:admin`                            | Create or update the admin user                    |
| `pnpm test:db`                               | Run the repository contract against local Supabase |

## Deploy (Vercel)

1. Create a Supabase project, then `supabase link` and `supabase db push`.
2. Supabase Dashboard → Authentication → Sign In / Providers → turn off **Allow new users to sign up**.
3. Set every variable from `.env.example` in Vercel, **except** `SUPABASE_SECRET_KEY`, `ADMIN_*` (those are for local seeding only).
4. Run `pnpm seed:admin` once against production from your machine.
