"use server";

import { headers } from "next/headers";
import { greetSchema } from "@/application/learn-service";
import type { Greeting } from "@/domain/learn/greeter";
import { fromDomainError, fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";

/** Public: anyone reading the lesson can run it. LearnService rate-limits by IP. */
export async function runGreet(
  _: ActionState,
  formData: FormData,
): Promise<ActionState & { greeting?: Greeting }> {
  const name = String(formData.get("name") ?? "");
  const input = greetSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ...fromZodError(input.error), values: { name } };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await container.public.learn().greet(ip, input.data);
  if (!result.ok) return { ...fromDomainError(result.error), values: { name } };
  return { ok: true, greeting: result.value, values: { name } };
}
