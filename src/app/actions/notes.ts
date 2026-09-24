"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { noteInputSchema } from "@/application/note-service";
import { fromDomainError, fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";
import { revalidatePublicPages } from "../_lib/revalidate";

const id = z.uuid();

export async function saveNote(
  noteId: string | null,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = noteInputSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return fromZodError(input.error);
  if (noteId !== null && !id.safeParse(noteId).success) return { error: "Invalid note" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const notes = await container.admin.notes();
  const saved = noteId ? await notes.update(noteId, input.data) : await notes.create(input.data);
  if (!saved.ok) return fromDomainError(saved.error);
  revalidatePublicPages();
  if (!noteId) redirect(`/admin/notes/${saved.value.id}`);
  return { ok: true, message: "Saved." };
}

async function changeStatus(noteId: string, change: "publish" | "unpublish"): Promise<ActionState> {
  if (!id.safeParse(noteId).success) return { error: "Invalid note" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const notes = await container.admin.notes();
  const result = change === "publish" ? await notes.publish(noteId) : await notes.unpublish(noteId);
  if (!result.ok) return fromDomainError(result.error);
  revalidatePublicPages();
  return { ok: true, message: change === "publish" ? "Published." : "Moved back to drafts." };
}

export async function publishNote(noteId: string): Promise<ActionState> {
  return changeStatus(noteId, "publish");
}

export async function unpublishNote(noteId: string): Promise<ActionState> {
  return changeStatus(noteId, "unpublish");
}

export async function deleteNote(noteId: string): Promise<ActionState> {
  if (!id.safeParse(noteId).success) return { error: "Invalid note" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const deleted = await (await container.admin.notes()).delete(noteId);
  if (!deleted.ok) return fromDomainError(deleted.error);
  revalidatePublicPages();
  redirect("/admin/notes");
}
