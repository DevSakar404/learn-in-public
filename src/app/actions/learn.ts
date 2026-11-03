"use server";

import { headers } from "next/headers";
import { greetSchema, workflowSchema } from "@/application/learn-service";
import type { Greeting } from "@/domain/learn/greeter";
import type { WorkflowRun } from "@/domain/learn/workflow";
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

  const result = await container.public.learn().greet(await clientIp(), input.data);
  if (!result.ok) return { ...fromDomainError(result.error), values: { name } };
  return { ok: true, greeting: result.value, values: { name } };
}

/** Public, like runGreet: one run of a workflow lesson (prompt chaining, routing, ...). */
export async function runWorkflow(
  _: ActionState,
  formData: FormData,
): Promise<ActionState & { run?: WorkflowRun }> {
  const values = { input: String(formData.get("input") ?? "") };
  const input = workflowSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { ...fromZodError(input.error), values };

  const result = await container.public.learn().runWorkflow(await clientIp(), input.data);
  if (!result.ok) return { ...fromDomainError(result.error), values };
  return { ok: true, run: result.value, values };
}

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
