import type { IClock } from "@/domain/clock";

/**
 * Fixed-window counter per key (e.g. an IP).
 * ponytail: in-memory, so each server instance counts on its own; move to a Supabase/Redis counter if abused.
 */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: IClock,
  ) {}

  /** Counts one attempt for `key`; false once the key is over the limit for this window. */
  take(key: string): boolean {
    const now = this.clock.now().getTime();
    if (this.windows.size > 10_000) this.prune(now);
    const window = this.windows.get(key);
    if (!window || now - window.start >= this.windowMs) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    if (window.count >= this.limit) return false;
    window.count++;
    return true;
  }

  private prune(now: number) {
    for (const [key, w] of this.windows)
      if (now - w.start >= this.windowMs) this.windows.delete(key);
  }
}
