"use server";

import { z } from "zod";
import { topicInputSchema } from "@/application/topic-service";
import { fromDomainError, fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";
import { revalidatePublicPages } from "../_lib/revalidate";

const id = z.uuid();

export async function saveTopic(
  topicId: string | null,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = topicInputSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return fromZodError(input.error);
  if (topicId !== null && !id.safeParse(topicId).success) return { error: "Invalid topic" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const topics = await container.admin.topics();
  const saved = topicId
    ? await topics.update(topicId, input.data)
    : await topics.create(input.data);
  if (!saved.ok) return fromDomainError(saved.error);
  revalidatePublicPages();
  return { ok: true, message: topicId ? "Topic updated." : `Topic "${saved.value.name}" created.` };
}

export async function deleteTopic(topicId: string): Promise<ActionState> {
  if (!id.safeParse(topicId).success) return { error: "Invalid topic" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const deleted = await (await container.admin.topics()).delete(topicId);
  if (!deleted.ok) return fromDomainError(deleted.error);
  revalidatePublicPages();
  return { ok: true, message: "Topic deleted." };
}
