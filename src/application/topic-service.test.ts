import { describe, expect, it } from "vitest";
import { setup } from "../../test/fakes/setup";

describe("TopicService", () => {
  it("creates topics with unique slugs and lists them by name", async () => {
    const t = setup();
    await t.topics.create({ name: "RAG", description: "" });
    const dup = await t.topics.create({ name: "RAG", description: "again" });
    await t.topics.create({ name: "Agents", description: "" });
    expect(dup.ok && dup.value.slug).toBe("rag-2");
    expect((await t.topics.list()).map((x) => x.name)).toEqual(["Agents", "RAG", "RAG"]);
  });

  it("keeps the slug when the name changes", async () => {
    const t = setup();
    const created = await t.topics.create({ name: "RAG", description: "" });
    if (!created.ok) throw created.error;
    const updated = await t.topics.update(created.value.id, {
      name: "Retrieval",
      description: "x",
    });
    expect(updated.ok && updated.value.slug).toBe("rag");
  });

  it("refuses to delete a topic that still has notes", async () => {
    const t = setup();
    const { topic, note } = await t.seedNote();
    const blocked = await t.topics.delete(topic.id);
    expect(!blocked.ok && blocked.error.code).toBe("CONFLICT");
    await t.notes.delete(note.id);
    expect((await t.topics.delete(topic.id)).ok).toBe(true);
  });
});
