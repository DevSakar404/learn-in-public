# F1: Admin auth · Phase 1

**Goal:** exactly one admin can write. Everyone else is read-only.

**Stories**

- As the admin, I log in with email + password at `/login` and log out from the admin layout.
- As a visitor, I'm redirected to `/login` from any `/admin/**` URL.

**Files by layer**

- db: `supabase/config.toml` (`enable_signup = false`), RLS admin predicate ([database.md](../architecture/database.md))
- infra: `auth/require-admin.ts`, `auth/is-admin.ts`, `supabase/server-client.ts`
- app: `src/proxy.ts`, `app/login/`, `app/admin/layout.tsx`, `app/actions/auth.ts`
- scripts: `scripts/seed-admin.ts` (`pnpm seed:admin`, idempotent, uses the secret key)

**Rules**

- Admin = `app_metadata.role === "admin"` (`app_metadata` can only be set by the server/admin API, so users can't forge it).
- Every admin action and page calls `requireAdmin()`. The proxy check alone isn't enough.
- Production: Supabase Dashboard → Authentication → Sign In / Providers → turn off **"Allow new users to sign up"**.

**Done when**

- [ ] Wrong password shows a clear error. An empty field shows the Zod field error.
- [ ] A non-admin logged-in user is redirected away from `/admin`.
- [ ] `pnpm seed:admin` twice → still one admin user.
