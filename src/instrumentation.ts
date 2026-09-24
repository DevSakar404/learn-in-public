// Runs once when the Next.js server starts: a missing or invalid env fails fast here.
export async function register() {
  const { getEnv } = await import("@/infrastructure/config/env");
  getEnv();
}
