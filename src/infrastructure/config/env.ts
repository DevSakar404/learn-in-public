import { z } from "zod";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Server-only config. Nothing here is NEXT_PUBLIC_*, so none of it can reach the browser.
const schema = z
  .object({
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    SITE_URL: z.url(),
    SITE_TIMEZONE: z.string().refine(isTimeZone, "must be an IANA time zone, e.g. Asia/Kolkata"),
    LLM_PROVIDER: z.enum(["google", "openai"]).default("google"),
    LLM_MODEL: z
      .string()
      .min(1)
      .refine((m) => !m.includes("latest"), "pin an exact model version, not *-latest"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const key = env.LLM_PROVIDER === "google" ? "GOOGLE_GENERATIVE_AI_API_KEY" : "OPENAI_API_KEY";
    if (!env[key])
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `required when LLM_PROVIDER=${env.LLM_PROVIDER}`,
      });
  });

// Treat `KEY=` (empty) in .env files as unset.
const dropEmpty = (raw: unknown) =>
  Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => v !== ""));

export const envSchema = z.preprocess(dropEmpty, schema);

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parses process.env once. Called from src/instrumentation.ts so a bad env fails at server start. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
