import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env";
import type { Database } from "./database.types";
import type { Db } from "./server-client";

let client: Db | undefined;

/** Anonymous client with no cookies, so public pages can be statically generated. RLS limits it to public data. */
export function createSupabasePublicClient(): Db {
  const env = getEnv();
  client ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
