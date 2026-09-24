import type { IClock } from "@/domain/clock";

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
