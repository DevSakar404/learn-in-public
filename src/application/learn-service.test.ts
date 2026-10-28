import { describe, expect, it } from "vitest";
import { GenerationError } from "@/domain/shared/errors";
import { FakeGreeter } from "../../test/fakes/fake-greeter";
import { FixedClock } from "../../test/fakes/fixed-clock";
import { greetSchema, LearnService } from "./learn-service";
import { RateLimiter } from "./rate-limiter";

function make(limit = 5) {
  const greeter = new FakeGreeter();
  const limiter = new RateLimiter(limit, 60_000, new FixedClock(new Date("2026-03-10T12:00:00Z")));
  return { greeter, service: new LearnService(greeter, limiter) };
}
const input = (name: string, website = "") => greetSchema.parse({ name, website });

describe("greetSchema", () => {
  it("trims the name and rejects empty or over-long names", () => {
    expect(greetSchema.parse({ name: "  Sam " }).name).toBe("Sam");
    expect(greetSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(greetSchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
    expect(greetSchema.safeParse({ name: "x".repeat(40) }).success).toBe(true);
  });
});

describe("LearnService.greet", () => {
  it("passes the name to the greeter", async () => {
    const { greeter, service } = make();
    const result = await service.greet("ip", input("Sam"));
    expect(result.ok && result.value.greeting).toBe("Hello, Sam!");
    expect(greeter.names).toEqual(["Sam"]);
  });

  it("returns the greeter's error", async () => {
    const { greeter, service } = make();
    greeter.failWith = new GenerationError("timeout", "slow");
    const result = await service.greet("ip", input("Sam"));
    expect(!result.ok && result.error.kind).toBe("timeout");
  });

  it("blocks over the limit without calling the model", async () => {
    const { greeter, service } = make(1);
    await service.greet("ip", input("Sam"));
    const blocked = await service.greet("ip", input("Sam"));
    expect(!blocked.ok && blocked.error.kind).toBe("rate_limit");
    expect(greeter.names).toHaveLength(1);
  });

  it("never calls the model for bots that fill the honeypot", async () => {
    const { greeter, service } = make();
    const result = await service.greet("ip", input("Sam", "spam.example"));
    expect(result.ok).toBe(false);
    expect(greeter.names).toHaveLength(0);
  });
});
