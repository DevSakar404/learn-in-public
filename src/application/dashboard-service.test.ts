import { describe, expect, it } from "vitest";
import { setup } from "../../test/fakes/setup";

describe("DashboardService", () => {
  it("counts published notes, pending drafts, posted posts, subscribers and the streak", async () => {
    const t = setup();
    const { note } = await t.seedNote();
    await t.notes.publish(note.id);
    await t.generation.generate(note.id, ["x", "linkedin", "youtube"]);
    const [first] = await t.posts.listForNote(note.id);
    await t.posts.update(first!.id, { status: "posted" });
    await t.subscribers.subscribe({ email: "a@b.co", website: "" });

    expect(await t.dashboard.stats()).toEqual({
      notesPublished: 1,
      draftsPending: 2,
      postsPosted: 1,
      subscribers: 1,
      streak: 1,
    });
  });
});
