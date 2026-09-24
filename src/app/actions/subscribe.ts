"use server";

import { subscribeSchema } from "@/application/subscriber-service";
import { fromDomainError, fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";

const MESSAGES = {
  subscribed: "Thanks for subscribing! You'll hear from me when the newsletter starts.",
  already_subscribed: "You're already subscribed. Thanks for following along!",
  ignored: "Thanks for subscribing! You'll hear from me when the newsletter starts.",
} as const;

export async function subscribe(_: ActionState, formData: FormData): Promise<ActionState> {
  const input = subscribeSchema.safeParse(Object.fromEntries(formData));
  if (!input.success)
    return { ...fromZodError(input.error), values: { email: String(formData.get("email") ?? "") } };

  const result = await container.public.subscribers().subscribe(input.data);
  if (!result.ok) return fromDomainError(result.error);
  return { ok: true, message: MESSAGES[result.value] };
}
