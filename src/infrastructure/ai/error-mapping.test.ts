import { describe, expect, it } from "vitest";
import { toGenerationError } from "./error-mapping";

describe("toGenerationError", () => {
  it("maps aborts and Mastra timeouts to timeout", () => {
    expect(toGenerationError(new DOMException("aborted", "TimeoutError")).kind).toBe("timeout");
    const mastra = Object.assign(new Error("run exceeded budget"), { name: "MastraTimeoutError" });
    expect(toGenerationError(mastra).kind).toBe("timeout");
  });

  it("maps 429s to rate_limit, even when wrapped", () => {
    const apiError = Object.assign(new Error("Too Many Requests"), { statusCode: 429 });
    expect(toGenerationError(new Error("generation failed", { cause: apiError })).kind).toBe(
      "rate_limit",
    );
    expect(toGenerationError(new Error("RESOURCE_EXHAUSTED: quota")).kind).toBe("rate_limit");
  });

  it("maps anything else to provider", () => {
    const e = toGenerationError(new Error("invalid api key"));
    expect(e.kind).toBe("provider");
    expect(e.message).toContain("invalid api key");
  });
});
