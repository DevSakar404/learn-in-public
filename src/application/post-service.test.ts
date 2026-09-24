import { describe, expect, it } from "vitest";
import { setup } from "../../test/fakes/setup";
import { postUpdateSchema } from "./post-service";

async function withDraft() {
  const t = setup();
  const { note } = await t.seedNote();
  await t.generation.generate(note.id, ["x"]);
  const [post] = await t.posts.listForNote(note.id);
  return { t, post: post! };
}

describe("PostService", () => {
  it("moves a draft through approved → posted with a URL", async () => {
    const { t, post } = await withDraft();
    await t.posts.update(post.id, { status: "approved" });
    const posted = await t.posts.update(post.id, {
      status: "posted",
      postedUrl: "https://x.com/me/status/1",
    });
    expect(posted.ok && posted.value.status).toBe("posted");
    expect(posted.ok && posted.value.postedUrl).toBe("https://x.com/me/status/1");
  });

  it("saves edited content that fits the platform schema", async () => {
    const { t, post } = await withDraft();
    const r = await t.posts.update(post.id, { content: { post: "Edited", thread: ["Two"] } });
    expect(r.ok && r.value.content).toEqual({ post: "Edited", thread: ["Two"] });
  });

  it("rejects edited content that breaks the schema", async () => {
    const { t, post } = await withDraft();
    const r = await t.posts.update(post.id, { content: { post: "x".repeat(300), thread: [] } });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });
});

describe("postUpdateSchema", () => {
  it("turns an empty posted URL into null and rejects non-URLs", () => {
    expect(postUpdateSchema.parse({ postedUrl: "" }).postedUrl).toBeNull();
    expect(postUpdateSchema.safeParse({ postedUrl: "not a url" }).success).toBe(false);
  });
});
