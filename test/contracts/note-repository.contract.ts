import { afterEach, expect, it } from "vitest";
import type { INoteReader, INoteWriter } from "@/domain/note/note-repository";
import type { ITopicReader, ITopicWriter } from "@/domain/topic/topic-repository";

export interface ContractRepos {
  notes: INoteReader & INoteWriter;
  topics: ITopicReader & ITopicWriter;
}

/**
 * Liskov check: every implementation of the note/topic ports must pass these.
 * Runs against the in-memory fakes always and against Supabase when SUPABASE_TEST=1.
 */
export function runNoteRepositoryContract(make: () => Promise<ContractRepos>) {
  const unique = () => `c-${crypto.randomUUID().slice(0, 8)}`;
  const created: { repos: ContractRepos; noteIds: string[]; topicIds: string[] }[] = [];

  // Leave the database as we found it (matters when running against a real Supabase).
  afterEach(async () => {
    for (const { repos, noteIds, topicIds } of created.splice(0)) {
      for (const id of noteIds) await repos.notes.delete(id);
      for (const id of topicIds) await repos.topics.delete(id);
    }
  });

  async function seed(repos: ContractRepos) {
    const topic = await repos.topics.create({ name: "Contract", slug: unique(), description: "" });
    if (!topic.ok) throw topic.error;
    const track = { repos, noteIds: [] as string[], topicIds: [topic.value.id] };
    created.push(track);
    const note = await repos.notes.create({
      title: "Contract note",
      slug: unique(),
      summary: "s",
      contentMd: "# hi",
      topicId: topic.value.id,
      videoUrl: null,
    });
    if (!note.ok) throw note.error;
    track.noteIds.push(note.value.id);
    return { topic: topic.value, note: note.value };
  }

  it("creates a draft note with its topic embedded", async () => {
    const repos = await make();
    const { note, topic } = await seed(repos);
    expect(note.status).toBe("draft");
    expect(note.publishedAt).toBeNull();
    expect(note.topic).toEqual({ id: topic.id, name: topic.name, slug: topic.slug });
    expect(await repos.notes.slugExists(note.slug)).toBe(true);
  });

  it("finds by id and slug, NotFound otherwise", async () => {
    const repos = await make();
    const { note } = await seed(repos);
    expect((await repos.notes.findById(note.id)).ok).toBe(true);
    expect((await repos.notes.findBySlug(note.slug)).ok).toBe(true);
    const missing = await repos.notes.findById(crypto.randomUUID());
    expect(!missing.ok && missing.error.code).toBe("NOT_FOUND");
  });

  it("rejects a duplicate slug with ConflictError", async () => {
    const repos = await make();
    const { note, topic } = await seed(repos);
    const dup = await repos.notes.create({ ...note, topicId: topic.id });
    expect(!dup.ok && dup.error.code).toBe("CONFLICT");
  });

  it("rejects an unknown topic with ValidationError", async () => {
    const repos = await make();
    const r = await repos.notes.create({
      title: "x",
      slug: unique(),
      summary: "",
      contentMd: "",
      topicId: crypto.randomUUID(),
      videoUrl: null,
    });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });

  it("updates only the given fields", async () => {
    const repos = await make();
    const { note } = await seed(repos);
    const publishedAt = new Date("2026-01-02T03:04:05.000Z");
    const r = await repos.notes.update(note.id, { status: "published", publishedAt });
    expect(r.ok && r.value.status).toBe("published");
    expect(r.ok && r.value.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    expect(r.ok && r.value.title).toBe(note.title);
  });

  it("filters by status and topic", async () => {
    const repos = await make();
    const { note, topic } = await seed(repos);
    const drafts = await repos.notes.list({ status: "draft", topicId: topic.id });
    expect(drafts.map((n) => n.id)).toEqual([note.id]);
    expect(await repos.notes.list({ status: "published", topicId: topic.id })).toEqual([]);
  });

  it("blocks deleting a topic with notes (ConflictError), then deletes", async () => {
    const repos = await make();
    const { note, topic } = await seed(repos);
    const blocked = await repos.topics.delete(topic.id);
    expect(!blocked.ok && blocked.error.code).toBe("CONFLICT");
    expect((await repos.notes.delete(note.id)).ok).toBe(true);
    expect((await repos.topics.delete(topic.id)).ok).toBe(true);
    const gone = await repos.notes.delete(note.id);
    expect(!gone.ok && gone.error.code).toBe("NOT_FOUND");
  });
}
