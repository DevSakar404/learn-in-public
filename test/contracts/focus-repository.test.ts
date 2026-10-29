import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseFocusRepository } from "@/infrastructure/repositories/supabase-focus-repository";
import type { Database } from "@/infrastructure/supabase/database.types";

/**
 * The focus_sync RPC through RLS, signed in as a real (throwaway) admin and a non-admin.
 * Needs `supabase start`; run with `pnpm test:db`.
 */
describe.runIf(process.env.SUPABASE_TEST === "1")("focus repository against local Supabase", () => {
  const url = () => process.env.SUPABASE_URL!;
  // Secret key: setup and cleanup only (bypasses RLS).
  const secret = () =>
    createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
  const signedIn = async (email: string) => {
    const db = createClient<Database>(url(), process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return db;
  };

  const password = `test-${crypto.randomUUID()}`;
  const adminEmail = `focus-test-admin-${crypto.randomUUID().slice(0, 8)}@local.test`;
  const userEmail = `focus-test-user-${crypto.randomUUID().slice(0, 8)}@local.test`;
  const userIds: string[] = [];
  const laptop = crypto.randomUUID();
  const phone = crypto.randomUUID();
  const day = "2026-10-28";
  let originalTarget = 25;

  beforeAll(async () => {
    for (const [email, app_metadata] of [
      [adminEmail, { role: "admin" }],
      [userEmail, {}],
    ] as const) {
      const { data, error } = await secret().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata,
      });
      if (error) throw error;
      userIds.push(data.user.id);
    }
    const { data } = await secret()
      .from("planner_settings")
      .select("focus_target_minutes")
      .single();
    originalTarget = data?.focus_target_minutes ?? 25;
  });

  // Leave the database as we found it.
  afterAll(async () => {
    await secret().from("focus_days").delete().in("device_id", [laptop, phone]);
    await secret()
      .from("planner_settings")
      .update({ focus_target_minutes: originalTarget })
      .eq("id", true);
    for (const id of userIds) await secret().auth.admin.deleteUser(id);
  });

  it("keeps the max per device, sums other devices and saves the target", async () => {
    const repo = new SupabaseFocusRepository(await signedIn(adminEmail));
    await repo.sync({ day, deviceId: laptop, minutes: 28 });
    await repo.sync({ day, deviceId: laptop, minutes: 20 }); // late, smaller: ignored
    const r = await repo.sync({ day, deviceId: phone, minutes: 10, target: 50 });
    expect(r.ok && r.value).toEqual({ otherMinutes: 28, target: 50 });

    const back = await repo.sync({ day, deviceId: laptop, minutes: 28 });
    expect(back.ok && back.value).toEqual({ otherMinutes: 10, target: 50 });
  });

  it("refuses a signed-in non-admin (RLS)", async () => {
    const repo = new SupabaseFocusRepository(await signedIn(userEmail));
    await expect(repo.sync({ day, deviceId: laptop, minutes: 99 })).rejects.toThrow();
    const { data } = await secret().from("focus_days").select("minutes").eq("device_id", laptop);
    expect(data).toEqual([{ minutes: 28 }]);
  });
});
