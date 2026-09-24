/** Same rule as public.is_admin() in the database. app_metadata can only be set server-side. */
export function isAdmin(
  user: { app_metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  return user?.app_metadata?.role === "admin";
}
