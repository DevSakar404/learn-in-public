import type { Result } from "../shared/result";

export interface AdminUser {
  id: string;
  email: string;
}

/** Session-based authentication for the single admin. */
export interface IAuthGateway {
  signIn(email: string, password: string): Promise<Result<AdminUser>>;
  signOut(): Promise<void>;
  /** The signed-in admin, or UnauthorizedError if no session or not an admin. */
  currentAdmin(): Promise<Result<AdminUser>>;
}
