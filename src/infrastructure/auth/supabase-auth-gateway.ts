import type { AdminUser, IAuthGateway } from "@/domain/auth/auth-gateway";
import { UnauthorizedError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Db } from "../supabase/server-client";
import { isAdmin } from "./is-admin";

export class SupabaseAuthGateway implements IAuthGateway {
  constructor(private readonly db: Db) {}

  async signIn(email: string, password: string): Promise<Result<AdminUser>> {
    const { data, error } = await this.db.auth.signInWithPassword({ email, password });
    if (error?.code === "invalid_credentials")
      return err(new UnauthorizedError("Invalid email or password"));
    if (error || !data.user) {
      // Not the user's fault (e.g. auth misconfigured or down): say so instead of blaming the password.
      console.error("[auth] sign-in failed", { code: error?.code, message: error?.message });
      return err(new UnauthorizedError("Sign-in is unavailable right now. Check the server logs."));
    }
    if (!isAdmin(data.user)) {
      await this.db.auth.signOut();
      return err(new UnauthorizedError("This account doesn't have admin access"));
    }
    return ok({ id: data.user.id, email: data.user.email ?? email });
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  /** getUser() verifies the session with the auth server; never trust the cookie alone. */
  async currentAdmin(): Promise<Result<AdminUser>> {
    const { data, error } = await this.db.auth.getUser();
    if (error || !isAdmin(data.user)) return err(new UnauthorizedError());
    return ok({ id: data.user.id, email: data.user.email ?? "" });
  }
}
