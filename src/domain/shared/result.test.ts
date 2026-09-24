import { describe, expect, it } from "vitest";
import { NotFoundError } from "./errors";
import { err, ok, type Result } from "./result";

describe("Result", () => {
  it("narrows on ok", () => {
    const r: Result<number> = Math.random() >= 0 ? ok(1) : err(new NotFoundError("Note", "x"));
    expect(r.ok && r.value).toBe(1);
  });

  it("carries a typed domain error", () => {
    const r: Result<number> = err(new NotFoundError("Note", "abc"));
    expect(!r.ok && r.error.code).toBe("NOT_FOUND");
    expect(!r.ok && r.error.message).toBe("Note not found: abc");
  });
});
