import { describe, expect, it } from "vitest";
import { GenerationError } from "@/domain/shared/errors";
import { PLATFORMS } from "@/domain/post/post";
import { setup } from "../../test/fakes/setup";

describe("ContentGenerationService", () => {
  it("generates a draft per platform and records model + prompt version", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    const r = await t.generation.generate(note.id, PLATFORMS);
    if (!r.ok) throw r.error;

    expect(r.value.map((o) => o.platform)).toEqual([...PLATFORMS]);
    expect(r.value.every((o) => o.result.ok)).toBe(true);
    const posts = await t.posts.listForNote(note.id);
    expect(posts).toHaveLength(4);
    expect(posts.find((p) => p.platform === "x")?.promptVersion).toBe("x.v1+voice.v1");
    expect(posts.every((p) => p.modelUsed === "fake-model-1" && p.status === "draft")).toBe(true);
  });

  it("puts the stable prompt first and the note last", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.generation.generate(note.id, ["linkedin"]);
    const req = t.generator.requests[0]!;
    expect(req.system).toContain("Platform: LinkedIn");
    expect(req.system).not.toContain(note.title);
    expect(req.prompt).toContain(note.title);
  });

  it("replaces an existing draft on regenerate", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.generation.generate(note.id, ["x"]);
    await t.generation.generate(note.id, ["x"]);
    expect(await t.posts.listForNote(note.id)).toHaveLength(1);
  });

  it("never overwrites approved or posted drafts", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.generation.generate(note.id, ["x", "linkedin"]);
    const [x] = (await t.posts.listForNote(note.id)).filter((p) => p.platform === "x");
    await t.posts.update(x!.id, { status: "approved" });

    const r = await t.generation.generate(note.id, ["x", "linkedin"]);
    if (!r.ok) throw r.error;
    const [xOutcome, liOutcome] = r.value;
    expect(!xOutcome!.result.ok && xOutcome!.result.error.code).toBe("CONFLICT");
    expect(liOutcome!.result.ok).toBe(true);
    expect((await t.posts.listForNote(note.id)).find((p) => p.platform === "x")?.status).toBe(
      "approved",
    );
  });

  it.each(["timeout", "rate_limit", "invalid_output"] as const)(
    "reports %s per platform",
    async (kind) => {
      const t = setup();
      const { note } = await t.seedNote();
      t.generator.failWith = new GenerationError(kind, "boom");
      const r = await t.generation.generate(note.id, ["youtube"]);
      if (!r.ok) throw r.error;
      const outcome = r.value[0]!.result;
      expect(!outcome.ok && outcome.error instanceof GenerationError && outcome.error.kind).toBe(
        kind,
      );
      expect(await t.posts.listForNote(note.id)).toHaveLength(0);
    },
  );

  it("isolates an unexpected throw to its platform", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    const original = t.generator.generate.bind(t.generator);
    t.generator.generate = async (req) => {
      if (req.system.includes("Platform: X")) throw new Error("socket hang up");
      return original(req);
    };
    const r = await t.generation.generate(note.id, ["x", "youtube"]);
    if (!r.ok) throw r.error;
    expect(r.value[0]!.result.ok).toBe(false);
    expect(r.value[1]!.result.ok).toBe(true);
  });

  it("returns NotFound for an unknown note", async () => {
    const t = setup();
    const r = await t.generation.generate(crypto.randomUUID(), ["x"]);
    expect(!r.ok && r.error.code).toBe("NOT_FOUND");
  });
});
