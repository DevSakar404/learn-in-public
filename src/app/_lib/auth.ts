import "server-only";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/domain/auth/auth-gateway";
import type { Result } from "@/domain/shared/result";
import { container } from "@/lib/container";

/** For admin pages and layouts: the real check (the proxy is only optimistic). */
export async function requireAdminPage(): Promise<AdminUser> {
  const admin = await (await container.auth()).currentAdmin();
  if (!admin.ok) redirect("/login");
  return admin.value;
}

/** For admin server actions: call first, before touching any service. */
export async function authorize(): Promise<Result<AdminUser>> {
  return (await container.auth()).currentAdmin();
}
