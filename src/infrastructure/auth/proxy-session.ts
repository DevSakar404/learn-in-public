import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "../config/env";
import type { Database } from "../supabase/database.types";
import { isAdmin } from "./is-admin";

/**
 * Optimistic admin gate for src/proxy.ts: refreshes the session cookie and redirects non-admins to /login.
 * Not the real authorization: every admin page and action checks again (see docs/architecture/app-layer.md).
 */
export async function guardAdminRoute(request: NextRequest): Promise<NextResponse> {
  const env = getEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (isAdmin(data?.claims)) return response;

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(login);
}
