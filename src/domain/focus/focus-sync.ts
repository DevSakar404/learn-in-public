import { z } from "zod";
import { FOCUS_TARGETS, type FocusTarget } from "./focus-timer";

/** One device's report: its own focus total for a local day. Docs: docs/specs/pomodoro-timer.md */
export const focusSyncSchema = z.object({
  day: z.iso.date(),
  deviceId: z.uuid(),
  minutes: z.number().int().min(0).max(1440),
  /** Sent only when the target was changed on this device. */
  target: z.literal(FOCUS_TARGETS).optional(),
});
export type FocusSyncInput = z.infer<typeof focusSyncSchema>;

export interface FocusSyncResult {
  /** The same day's minutes from the admin's other devices. */
  otherMinutes: number;
  target: FocusTarget;
}
