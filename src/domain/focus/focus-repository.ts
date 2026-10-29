import type { Result } from "../shared/result";
import type { FocusSyncInput, FocusSyncResult } from "./focus-sync";

export interface IFocusRepository {
  /** Keeps the larger of the stored and sent minutes for (day, device); saves the target if sent. */
  sync(input: FocusSyncInput): Promise<Result<FocusSyncResult>>;
}
