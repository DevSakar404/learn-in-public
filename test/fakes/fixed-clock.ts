import type { IClock } from "@/domain/clock";

export class FixedClock implements IClock {
  constructor(public current: Date) {}
  now(): Date {
    return this.current;
  }
}
