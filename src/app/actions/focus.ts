"use server";

import type { FocusSyncResult } from "@/domain/focus/focus-sync";
import { focusSyncSchema } from "@/domain/focus/focus-sync";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";

export type SyncFocusResult = ({ ok: true } & FocusSyncResult) | { ok: false; code: string };

/** Admin only: called every minute by browsers that have opened /admin. */
export async function syncFocus(raw: unknown): Promise<SyncFocusResult> {
  const input = focusSyncSchema.safeParse(raw);
  if (!input.success) return { ok: false, code: "VALIDATION" };
  const auth = await authorize();
  if (!auth.ok) return { ok: false, code: auth.error.code };

  const synced = await (await container.admin.focus()).sync(input.data);
  return synced.ok ? { ok: true, ...synced.value } : { ok: false, code: synced.error.code };
}
