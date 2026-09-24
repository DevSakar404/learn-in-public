"use server";

import { z } from "zod";
import { postUpdateSchema } from "@/application/post-service";
import { PLATFORMS, type AnyPost, type Platform } from "@/domain/post/post";
import { GenerationError } from "@/domain/shared/errors";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";

export type GenerationOutcome =
  | { platform: Platform; ok: true; post: AnyPost }
  | { platform: Platform; ok: false; error: string; retryable: boolean };

export type GenerateResult = { error: string } | { outcomes: GenerationOutcome[] };

const generateSchema = z.object({
  noteId: z.uuid(),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Choose at least one platform"),
});

/** Admin-only. The note page sets maxDuration = 60 for this action. */
export async function generateDrafts(
  noteId: string,
  platforms: Platform[],
): Promise<GenerateResult> {
  const input = generateSchema.safeParse({ noteId, platforms: [...new Set(platforms)] });
  if (!input.success) return { error: z.prettifyError(input.error) };
  const auth = await authorize();
  if (!auth.ok) return { error: auth.error.message };

  const result = await (
    await container.admin.generation()
  ).generate(input.data.noteId, input.data.platforms);
  if (!result.ok) return { error: result.error.message };
  return {
    outcomes: result.value.map(({ platform, result: r }) =>
      r.ok
        ? { platform, ok: true, post: r.value }
        : {
            platform,
            ok: false,
            error: r.error.message,
            retryable: r.error instanceof GenerationError,
          },
    ),
  };
}

export type UpdateDraftResult = { ok: true; post: AnyPost } | { ok: false; error: string };

export async function updateDraft(postId: string, update: unknown): Promise<UpdateDraftResult> {
  const id = z.uuid().safeParse(postId);
  const input = postUpdateSchema.safeParse(update);
  if (!id.success || !input.success) {
    return { ok: false, error: input.error ? z.prettifyError(input.error) : "Invalid draft" };
  }
  const auth = await authorize();
  if (!auth.ok) return { ok: false, error: auth.error.message };

  const result = await (await container.admin.posts()).update(id.data, input.data);
  return result.ok ? { ok: true, post: result.value } : { ok: false, error: result.error.message };
}
