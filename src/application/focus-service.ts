import type { IClock } from "@/domain/clock";
import type { IFocusRepository } from "@/domain/focus/focus-repository";
import type { FocusSyncInput, FocusSyncResult } from "@/domain/focus/focus-sync";
import { ValidationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";

const DAY_MS = 86_400_000;

/** The admin's focus minutes, synced across devices. Readers never reach this. */
export class FocusService {
  constructor(
    private readonly repo: IFocusRepository,
    private readonly clock: IClock,
  ) {}

  /** The day is the device's local date, so it may be one day either side of today in UTC. */
  async sync(input: FocusSyncInput): Promise<Result<FocusSyncResult>> {
    const today = Date.parse(this.clock.now().toISOString().slice(0, 10));
    if (Math.abs(Date.parse(input.day) - today) > DAY_MS) {
      return err(new ValidationError("That day is too far from today"));
    }
    return this.repo.sync(input);
  }
}
