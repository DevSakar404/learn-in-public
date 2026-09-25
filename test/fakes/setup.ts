import { ContentGenerationService } from "@/application/content-generation-service";
import { defaultStrategies } from "@/application/content/strategies/registry";
import { DashboardService } from "@/application/dashboard-service";
import { NoteService, type NoteInput } from "@/application/note-service";
import { PlannerService } from "@/application/planner/planner-service";
import { PostService } from "@/application/post-service";
import { SlugService } from "@/application/slug-service";
import { SubscriberService } from "@/application/subscriber-service";
import { TopicService } from "@/application/topic-service";
import { FakeContentGenerator } from "./fake-content-generator";
import { FixedClock } from "./fixed-clock";
import {
  InMemoryNoteRepository,
  InMemoryPlannerSettingsRepository,
  InMemoryPostRepository,
  InMemoryStore,
  InMemorySubscriberRepository,
  InMemoryTopicRepository,
} from "./in-memory-store";
import { sampleFor } from "./sample-content";

/** The test-side composition root: same wiring as src/lib/container.ts, with fakes. */
export function setup(now = new Date("2026-03-10T12:00:00Z")) {
  const store = new InMemoryStore();
  const clock = new FixedClock(now);
  const slugs = new SlugService();
  const topicRepo = new InMemoryTopicRepository(store);
  const noteRepo = new InMemoryNoteRepository(store);
  const postRepo = new InMemoryPostRepository(store);
  const subscriberRepo = new InMemorySubscriberRepository(store);
  const plannerRepo = new InMemoryPlannerSettingsRepository(store);
  const generator = new FakeContentGenerator((req) => sampleFor(req.system));

  const topics = new TopicService(topicRepo, topicRepo, slugs);
  const notes = new NoteService(noteRepo, noteRepo, slugs, clock);

  return {
    store,
    clock,
    generator,
    topics,
    notes,
    posts: new PostService(postRepo, postRepo, clock),
    planner: new PlannerService(noteRepo, postRepo, plannerRepo, plannerRepo, clock, {
      timeZone: "Asia/Kolkata",
      siteName: "Learn in Public",
      siteUrl: "https://example.dev",
    }),
    generation: new ContentGenerationService(
      noteRepo,
      postRepo,
      postRepo,
      generator,
      defaultStrategies(),
    ),
    subscribers: new SubscriberService(subscriberRepo, subscriberRepo),
    dashboard: new DashboardService(noteRepo, postRepo, subscriberRepo, clock, "Asia/Kolkata"),

    /** A topic + a draft note, ready to use. */
    async seedNote(overrides: Partial<NoteInput> = {}) {
      const topic = await topics.create({ name: "RAG", description: "" });
      if (!topic.ok) throw topic.error;
      const note = await notes.create({
        title: "Day 1: Tokens",
        summary: "What a token is",
        contentMd: "# Tokens\n\nThey are not words.",
        topicId: topic.value.id,
        videoUrl: null,
        ...overrides,
      });
      if (!note.ok) throw note.error;
      return { topic: topic.value, note: note.value };
    },
  };
}
