import { describe, expect, it } from "vitest";
import { setup } from "../../test/fakes/setup";
import { noteInputSchema } from "./note-service";

describe("NoteService", () => {
  it("creates drafts with a unique slug", async () => {
    const t = setup();
    const { note, topic } = await t.seedNote();
    const again = await t.notes.create({ ...note, topicId: topic.id, videoUrl: null });
    expect(note.status).toBe("draft");
    expect(note.slug).toBe("day-1-tokens");
    expect(again.ok && again.value.slug).toBe("day-1-tokens-2");
  });

  it("publishes with the clock's time, idempotently", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    const published = await t.notes.publish(note.id);
    expect(published.ok && published.value.publishedAt).toEqual(t.clock.now());

    t.clock.current = new Date("2026-04-01T00:00:00Z");
    const again = await t.notes.publish(note.id);
    expect(again.ok && again.value.publishedAt).toEqual(new Date("2026-03-10T12:00:00Z"));
  });

  it("keeps the first published date across unpublish/publish", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.notes.publish(note.id);
    const draft = await t.notes.unpublish(note.id);
    expect(draft.ok && draft.value.status).toBe("draft");
    t.clock.current = new Date("2026-05-01T00:00:00Z");
    const republished = await t.notes.publish(note.id);
    expect(republished.ok && republished.value.publishedAt).toEqual(
      new Date("2026-03-10T12:00:00Z"),
    );
  });

  it("hides drafts from getPublishedBySlug", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    const hidden = await t.notes.getPublishedBySlug(note.slug);
    expect(!hidden.ok && hidden.error.code).toBe("NOT_FOUND");
    await t.notes.publish(note.id);
    expect((await t.notes.getPublishedBySlug(note.slug)).ok).toBe(true);
  });

  it("lists published notes newest first and filters by topic", async () => {
    const t = setup();
    const { note: a, topic } = await t.seedNote({ title: "A" });
    const b = await t.notes.create({
      title: "B",
      summary: "",
      contentMd: "",
      topicId: topic.id,
      videoUrl: null,
      sessionMinutes: null,
    });
    if (!b.ok) throw b.error;
    await t.notes.publish(a.id);
    t.clock.current = new Date("2026-03-11T12:00:00Z");
    await t.notes.publish(b.value.id);

    expect((await t.notes.listPublished()).map((n) => n.title)).toEqual(["B", "A"]);
    expect(await t.notes.listPublished({ topicId: crypto.randomUUID() })).toEqual([]);
  });

  it("suggests the next published note in the same topic, oldest first", async () => {
    const t = setup();
    const { note: first, topic } = await t.seedNote({ title: "First" });
    const create = async (title: string, topicId = topic.id) => {
      const r = await t.notes.create({
        title,
        summary: "",
        contentMd: "",
        topicId,
        videoUrl: null,
        sessionMinutes: null,
      });
      if (!r.ok) throw r.error;
      return r.value;
    };
    const second = await create("Second");
    const third = await create("Third");
    const otherTopic = await t.topics.create({ name: "Evals", description: "" });
    if (!otherTopic.ok) throw otherTopic.error;
    const elsewhere = await create("Elsewhere", otherTopic.value.id);
    await create("Draft"); // never published

    const publishAt = async (id: string, iso: string) => {
      t.clock.current = new Date(iso);
      const r = await t.notes.publish(id);
      if (!r.ok) throw r.error;
      return r.value;
    };
    const p1 = await publishAt(first.id, "2026-03-10T12:00:00Z");
    await publishAt(elsewhere.id, "2026-03-11T12:00:00Z");
    const p2 = await publishAt(second.id, "2026-03-12T12:00:00Z");
    const p3 = await publishAt(third.id, "2026-03-13T12:00:00Z");

    expect((await t.notes.nextInTopic(p1))?.title).toBe("Second");
    expect((await t.notes.nextInTopic(p2))?.title).toBe("Third");
    expect(await t.notes.nextInTopic(p3)).toBeNull();
  });

  it("returns the deleted note and cascades its drafts", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.generation.generate(note.id, ["x"]);
    const deleted = await t.notes.delete(note.id);
    expect(deleted.ok && deleted.value.slug).toBe(note.slug);
    expect(t.store.posts.size).toBe(0);
    expect((await t.notes.get(note.id)).ok).toBe(false);
  });

  it("returns NotFound for unknown ids", async () => {
    const t = setup();
    const r = await t.notes.publish(crypto.randomUUID());
    expect(!r.ok && r.error.code).toBe("NOT_FOUND");
  });
});

describe("noteInputSchema", () => {
  const base = { title: "T", topicId: crypto.randomUUID() };

  it("normalises an empty video URL to null", () => {
    expect(noteInputSchema.parse({ ...base, videoUrl: "" }).videoUrl).toBeNull();
  });

  it("parses session minutes: blank is null, 5–240 whole minutes only", () => {
    const minutes = (v: string) => noteInputSchema.safeParse({ ...base, sessionMinutes: v });
    expect(noteInputSchema.parse(base).sessionMinutes).toBeNull();
    expect(minutes("").data?.sessionMinutes).toBeNull();
    expect(minutes("12").data?.sessionMinutes).toBe(12);
    for (const bad of ["4", "241", "7.5", "ten"]) expect(minutes(bad).success).toBe(false);
  });

  it("accepts YouTube links and rejects others", () => {
    expect(
      noteInputSchema.safeParse({ ...base, videoUrl: "https://youtu.be/dQw4w9WgXcQ" }).success,
    ).toBe(true);
    expect(noteInputSchema.safeParse({ ...base, videoUrl: "https://vimeo.com/1" }).success).toBe(
      false,
    );
  });

  it("requires a title and a topic", () => {
    const r = noteInputSchema.safeParse({ title: " ", topicId: "nope" });
    expect(r.success).toBe(false);
    expect(Object.keys(r.error!.flatten().fieldErrors).sort()).toEqual(["title", "topicId"]);
  });
});
