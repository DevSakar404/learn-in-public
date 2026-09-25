# Learn in Public

A blog + content studio for learning AI engineering in public. You write a daily note, it's published as a blog post, and an AI agent drafts posts for X, LinkedIn, Instagram and YouTube for you to review.

Stack: Next.js 16 · TypeScript (strict) · Supabase (Postgres, Auth, RLS) · Tailwind + shadcn/ui · Zod · Mastra (Gemini / OpenAI) · Vitest.
Architecture and conventions: [CLAUDE.md](CLAUDE.md) → [docs/](docs/00-overview.md).

## Local setup

### 1. Install the tools (one time)

```bash
corepack enable pnpm
brew install supabase/tap/supabase
brew install --cask orbstack
```

Open **OrbStack** once so Docker is running.

### 2. Install dependencies and start the local database

```bash
pnpm install
supabase start
```

The first start downloads the Supabase images (a few minutes). Run it **once**; don't start it from two terminals at the same time.

### 3. Create `.env.local`

```bash
cp .env.example .env.local
supabase status -o env
```

Fill `.env.local` from that output: `API_URL` → `SUPABASE_URL`, `PUBLISHABLE_KEY` → `SUPABASE_PUBLISHABLE_KEY`, `SECRET_KEY` → `SUPABASE_SECRET_KEY`. Then set:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters): your local admin login.
- `SITE_URL=http://localhost:3000` and `SITE_TIMEZONE` (e.g. `Asia/Kolkata`).
- The AI model, one of:
  - **Gemini (recommended):** `LLM_PROVIDER=google`, `LLM_MODEL=gemini-3.5-flash-lite`, `GOOGLE_GENERATIVE_AI_API_KEY` (free at https://aistudio.google.com/apikey).
  - **Local Ollama (dev only):** `LLM_PROVIDER=ollama`, `LLM_MODEL=qwen2.5-coder:7b`. Keep one small model loaded.

The app refuses to start if a variable is missing or invalid (`src/infrastructure/config/env.ts`).

### 4. Create the admin and run

```bash
pnpm seed:admin
pnpm dev
```

Open http://localhost:3000 (blog) and http://localhost:3000/login (admin). `supabase db reset` wipes the local database back to the sample data; run `pnpm seed:admin` again afterwards.

### 5. Check everything works

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:db
```

`test:db` runs against the local database (Supabase must be running).

## Deploy (Supabase cloud + Vercel)

Do these in order: the Vercel build pre-renders the blog from the database, so the tables must exist first.

### 1. Supabase project and database

1. Create a project at https://supabase.com. Save the **database password**.
2. Log in and link (the project ref is in the dashboard URL: `/dashboard/project/<project-ref>`):

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   ```

3. Preview, then apply the migrations (`seed.sql` is **not** pushed, so production starts empty):

   ```bash
   supabase db push --dry-run
   supabase db push
   ```

4. Dashboard → **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Keep the **Email** provider **on** (the admin logs in with it).
5. Dashboard → **Authentication → URL Configuration**: set **Site URL** to your production URL (after step 2.3 you'll know it).

### 2. Code and hosting

1. Push the code to a new **private** GitHub repository.
2. At https://vercel.com: **Add New → Project → import the repo** (framework: Next.js, detected automatically).
3. Before the first deploy, add the **environment variables** (Project → Settings → Environment Variables):

   | Variable                       | Value                                                          |
   | ------------------------------ | -------------------------------------------------------------- |
   | `SUPABASE_URL`                 | Supabase → Project Settings → Data API → Project URL           |
   | `SUPABASE_PUBLISHABLE_KEY`     | Supabase → Project Settings → API Keys → publishable key       |
   | `SITE_URL`                     | your production URL, e.g. `https://learn-in-public.vercel.app` |
   | `SITE_TIMEZONE`                | e.g. `Asia/Kolkata`                                            |
   | `LLM_PROVIDER`                 | `google` (**not** `ollama`: Vercel can't reach your Mac)       |
   | `LLM_MODEL`                    | `gemini-3.5-flash-lite`                                        |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | your Gemini key                                                |
   | `ENABLE_EXPERIMENTAL_COREPACK` | `1` (so Vercel uses the pnpm version from `package.json`)      |

   **Never** add `SUPABASE_SECRET_KEY`, `ADMIN_EMAIL` or `ADMIN_PASSWORD` to Vercel.

4. Deploy. If you change `SITE_URL` later, redeploy.

### 3. Production admin

Create `.env.prod` on your machine (gitignored; delete it afterwards if you like):

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<Supabase → Project Settings → API Keys → secret key>
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<a long, unique password>
```

```bash
pnpm seed:admin:prod
```

### 4. First run in production

1. Sign in at `<SITE_URL>/login`.
2. **Topics**: create your topics. **Notes**: write and publish your first note.
3. **Planner**: set the daily time, YouTube day and Day 1, then copy the calendar link into Google/Apple Calendar.
4. Open a note → **Generate drafts** to check the AI key works.

## Scripts

| Script                                       | What it does                                        |
| -------------------------------------------- | --------------------------------------------------- |
| `pnpm dev` / `build` / `start`               | Next.js                                             |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Quality checks (all must pass)                      |
| `pnpm format`                                | Prettier                                            |
| `pnpm seed:admin`                            | Create or update the local admin (`.env.local`)     |
| `pnpm seed:admin:prod`                       | Create or update the production admin (`.env.prod`) |
| `pnpm test:db`                               | Integration tests against the local database        |
