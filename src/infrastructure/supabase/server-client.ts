import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getEnv } from "../config/env";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

/** Cookie-session client for admin pages and server actions. Makes the route dynamic. */
export async function createSupabaseServerClient(): Promise<Db> {
  const cookieStore = await cookies();
  const env = getEnv();
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. src/proxy.ts refreshes the session.
        }
      },
    },
  });
}
