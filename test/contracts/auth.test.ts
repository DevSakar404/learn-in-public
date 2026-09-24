import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseAuthGateway } from "@/infrastructure/auth/supabase-auth-gateway";
import type { Database } from "@/infrastructure/supabase/database.types";

/**
 * Real auth server + real supabase/config.toml: catches config regressions that fakes can't
 * (e.g. email logins disabled, sign-ups accidentally enabled). Needs `supabase start`; run with `pnpm test:db`.
 */
describe.runIf(process.env.SUPABASE_TEST === "1")("auth against local Supabase", () => {
  const url = process.env.SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const anonClient = () =>
    createClient<Database>(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });

  // Throwaway users with random credentials, deleted afterwards.
  const password = `test-${crypto.randomUUID()}`;
  const adminEmail = `auth-test-admin-${crypto.randomUUID().slice(0, 8)}@local.test`;
  const userEmail = `auth-test-user-${crypto.randomUUID().slice(0, 8)}@local.test`;
  const createdIds: string[] = [];

  beforeAll(async () => {
    for (const [email, app_metadata] of [
      [adminEmail, { role: "admin" }],
      [userEmail, {}],
    ] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata,
      });
      if (error) throw error;
      createdIds.push(data.user.id);
    }
  });

  afterAll(async () => {
    for (const id of createdIds) await admin.auth.admin.deleteUser(id);
  });

  it("lets the admin sign in with email + password", async () => {
    const result = await new SupabaseAuthGateway(anonClient()).signIn(adminEmail, password);
    expect(result.ok && result.value.email).toBe(adminEmail);
  });

  it("rejects a wrong password with the credentials message", async () => {
    const result = await new SupabaseAuthGateway(anonClient()).signIn(adminEmail, "wrong-password");
    expect(!result.ok && result.error.message).toBe("Invalid email or password");
  });

  it("rejects a signed-in user who isn't an admin", async () => {
    const result = await new SupabaseAuthGateway(anonClient()).signIn(userEmail, password);
    expect(!result.ok && result.error.message).toMatch(/admin access/);
  });

  it("keeps public sign-ups disabled", async () => {
    const { error } = await anonClient().auth.signUp({
      email: `signup-${crypto.randomUUID()}@local.test`,
      password,
    });
    expect(error?.code).toBe("signup_disabled");
  });
});
