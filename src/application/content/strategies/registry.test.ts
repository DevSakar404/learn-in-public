import { describe, expect, it } from "vitest";
import { PLATFORMS } from "@/domain/post/post";
import { defaultStrategies, StrategyRegistry } from "./registry";

describe("StrategyRegistry", () => {
  it("registers one strategy per platform", () => {
    expect(defaultStrategies().platforms().sort()).toEqual([...PLATFORMS].sort());
  });

  it("throws for an unregistered platform (a wiring bug, not an expected failure)", () => {
    expect(() => new StrategyRegistry([]).get("x")).toThrow(/No content strategy/);
  });

  it("versions every prompt with the shared voice version", () => {
    const registry = defaultStrategies();
    for (const p of PLATFORMS)
      expect(registry.get(p).promptVersion).toMatch(/^\w+\.v\d+\+voice\.v\d+$/);
  });
});
