import { describe, expect, it } from "vitest";
import { FixedClock } from "../../test/fakes/fixed-clock";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  it("allows the limit, blocks the next, and resets after the window", () => {
    const clock = new FixedClock(new Date("2026-03-10T12:00:00Z"));
    const limiter = new RateLimiter(5, 60_000, clock);
    for (let i = 0; i < 5; i++) expect(limiter.take("1.2.3.4")).toBe(true);
    expect(limiter.take("1.2.3.4")).toBe(false);
    expect(limiter.take("5.6.7.8")).toBe(true);

    clock.current = new Date("2026-03-10T12:01:00Z");
    expect(limiter.take("1.2.3.4")).toBe(true);
  });
});
