import type { IFocusRepository } from "@/domain/focus/focus-repository";
import type { FocusSyncInput, FocusSyncResult } from "@/domain/focus/focus-sync";
import { FOCUS_TARGETS } from "@/domain/focus/focus-timer";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Db } from "../supabase/server-client";
import { toDomainError } from "./db-errors";

/** Admin-only (RLS): one row per (day, device) via the focus_sync RPC, which keeps the max. */
export class SupabaseFocusRepository implements IFocusRepository {
  constructor(private readonly db: Db) {}

  async sync(input: FocusSyncInput): Promise<Result<FocusSyncResult>> {
    const { data, error } = await this.db.rpc("focus_sync", {
      p_day: input.day,
      p_device_id: input.deviceId,
      p_minutes: input.minutes,
      p_target: input.target,
    });
    if (error) return err(toDomainError(error, "focus day", "write"));
    const row = data[0];
    const target = FOCUS_TARGETS.find((t) => t === row?.target);
    if (!row || !target) throw new Error("focus_sync returned no row or an unknown target");
    return ok({ otherMinutes: row.other_minutes, target });
  }
}
