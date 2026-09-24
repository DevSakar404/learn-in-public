/**
 * Creates (or updates) the single admin user. Idempotent: safe to run any number of times.
 * Usage: pnpm seed:admin   (reads SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD from .env.local)
 * The secret key bypasses RLS, so it is only ever used by scripts like this one, never by the app.
 */
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const env = z
  .object({
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
    ADMIN_PASSWORD: z.string().min(12, "use at least 12 characters"),
  })
  .parse(process.env);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user || data.users.length < 200) return user;
  }
}

const existing = await findUserByEmail(env.ADMIN_EMAIL);
const attributes = {
  password: env.ADMIN_PASSWORD,
  email_confirm: true,
  app_metadata: { ...existing?.app_metadata, role: "admin" },
};

const { error } = existing
  ? await supabase.auth.admin.updateUserById(existing.id, attributes)
  : await supabase.auth.admin.createUser({ email: env.ADMIN_EMAIL, ...attributes });
if (error) throw error;

console.log(`${existing ? "Updated" : "Created"} admin ${env.ADMIN_EMAIL}`);
