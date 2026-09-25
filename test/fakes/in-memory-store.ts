import type { Note } from "@/domain/note/note";
import type { PlannerSchedule, PlannerSettings } from "@/domain/planner/planner-settings";
import type {
  IPlannerSettingsReader,
  IPlannerSettingsWriter,
} from "@/domain/planner/planner-settings-repository";
import type {
  INoteReader,
  INoteWriter,
  NewNote,
  NoteFilter,
  NotePatch,
} from "@/domain/note/note-repository";
import type { AnyPost, PostStatus } from "@/domain/post/post";
import type { DraftData, IPostReader, IPostWriter, PostPatch } from "@/domain/post/post-repository";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Subscriber } from "@/domain/subscriber/subscriber";
import type {
  ISubscriberReader,
  ISubscriberWriter,
} from "@/domain/subscriber/subscriber-repository";
import type { Topic } from "@/domain/topic/topic";
import type { ITopicReader, ITopicWriter, NewTopic } from "@/domain/topic/topic-repository";

type NoteRow = Omit<Note, "topic"> & { topicId: string };

/** One shared store so foreign keys and cascades behave like Postgres. */
export class InMemoryStore {
  topics = new Map<string, Topic>();
  notes = new Map<string, NoteRow>();
  posts = new Map<string, AnyPost>();
  subscribers = new Map<string, Subscriber>();
  planner: PlannerSettings = {
    dailyTime: "20:00",
    youtubeWeekday: 0,
    reminderMinutes: 30,
    journeyStart: "2026-03-01",
    calendarToken: crypto.randomUUID(),
  };
  private tick = 0;

  /** Strictly increasing timestamps so ordering is deterministic. */
  now(): Date {
    return new Date(Date.UTC(2026, 0, 1) + this.tick++ * 1000);
  }
}

export class InMemoryTopicRepository implements ITopicReader, ITopicWriter {
  constructor(private readonly db: InMemoryStore) {}

  async list() {
    return [...this.db.topics.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  async findById(id: string): Promise<Result<Topic>> {
    const t = this.db.topics.get(id);
    return t ? ok(t) : err(new NotFoundError("Topic", id));
  }
  async findBySlug(slug: string): Promise<Result<Topic>> {
    const t = [...this.db.topics.values()].find((x) => x.slug === slug);
    return t ? ok(t) : err(new NotFoundError("Topic", slug));
  }
  async slugExists(slug: string) {
    return [...this.db.topics.values()].some((t) => t.slug === slug);
  }
  async create(data: NewTopic): Promise<Result<Topic>> {
    if (await this.slugExists(data.slug))
      return err(new ConflictError("A topic with this slug already exists"));
    const topic: Topic = { id: crypto.randomUUID(), ...data, createdAt: this.db.now() };
    this.db.topics.set(topic.id, topic);
    return ok(topic);
  }
  async update(id: string, data: Omit<NewTopic, "slug">): Promise<Result<Topic>> {
    const t = this.db.topics.get(id);
    if (!t) return err(new NotFoundError("Topic", id));
    const updated = { ...t, ...data };
    this.db.topics.set(id, updated);
    return ok(updated);
  }
  async delete(id: string): Promise<Result<void>> {
    if (!this.db.topics.has(id)) return err(new NotFoundError("Topic", id));
    if ([...this.db.notes.values()].some((n) => n.topicId === id)) {
      return err(new ConflictError("This topic still has notes. Move or delete them first."));
    }
    this.db.topics.delete(id);
    return ok(undefined);
  }
}

export class InMemoryNoteRepository implements INoteReader, INoteWriter {
  constructor(private readonly db: InMemoryStore) {}

  private toNote(row: NoteRow): Note {
    const { topicId, ...rest } = row;
    const t = this.db.topics.get(topicId)!;
    return { ...rest, topic: { id: t.id, name: t.name, slug: t.slug } };
  }

  async list(filter: NoteFilter = {}) {
    const rows = [...this.db.notes.values()]
      .filter((n) => !filter.status || n.status === filter.status)
      .filter((n) => !filter.topicId || n.topicId === filter.topicId)
      .sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? -Infinity) - (a.publishedAt?.getTime() ?? -Infinity) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
    return rows.slice(0, filter.limit ?? rows.length).map((r) => this.toNote(r));
  }
  async findById(id: string): Promise<Result<Note>> {
    const n = this.db.notes.get(id);
    return n ? ok(this.toNote(n)) : err(new NotFoundError("Note", id));
  }
  async findBySlug(slug: string): Promise<Result<Note>> {
    const n = [...this.db.notes.values()].find((x) => x.slug === slug);
    return n ? ok(this.toNote(n)) : err(new NotFoundError("Note", slug));
  }
  async slugExists(slug: string) {
    return [...this.db.notes.values()].some((n) => n.slug === slug);
  }
  async create(data: NewNote): Promise<Result<Note>> {
    if (await this.slugExists(data.slug))
      return err(new ConflictError("A note with this slug already exists"));
    if (!this.db.topics.has(data.topicId)) return err(new ValidationError("Topic does not exist"));
    const now = this.db.now();
    const row: NoteRow = {
      id: crypto.randomUUID(),
      ...data,
      status: "draft",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.db.notes.set(row.id, row);
    return ok(this.toNote(row));
  }
  async update(id: string, patch: NotePatch): Promise<Result<Note>> {
    const n = this.db.notes.get(id);
    if (!n) return err(new NotFoundError("Note", id));
    if (patch.topicId && !this.db.topics.has(patch.topicId))
      return err(new ValidationError("Topic does not exist"));
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const updated: NoteRow = { ...n, ...defined, updatedAt: this.db.now() };
    this.db.notes.set(id, updated);
    return ok(this.toNote(updated));
  }
  async delete(id: string): Promise<Result<void>> {
    if (!this.db.notes.delete(id)) return err(new NotFoundError("Note", id));
    for (const [pid, p] of this.db.posts) if (p.noteId === id) this.db.posts.delete(pid); // cascade
    return ok(undefined);
  }
}

export class InMemoryPostRepository implements IPostReader, IPostWriter {
  constructor(private readonly db: InMemoryStore) {}

  async listByNote(noteId: string) {
    return [...this.db.posts.values()].filter((p) => p.noteId === noteId);
  }
  async findById(id: string): Promise<Result<AnyPost>> {
    const p = this.db.posts.get(id);
    return p ? ok(p) : err(new NotFoundError("Post", id));
  }
  async countByStatus() {
    const counts: Record<PostStatus, number> = { draft: 0, approved: 0, posted: 0 };
    for (const p of this.db.posts.values()) counts[p.status]++;
    return counts;
  }
  async listPostedSince(since: Date) {
    return [...this.db.posts.values()].filter((p) => p.postedAt && p.postedAt >= since);
  }
  async upsertDraft(data: DraftData): Promise<Result<AnyPost>> {
    if (!this.db.notes.has(data.noteId)) return err(new ValidationError("Note does not exist"));
    const existing = [...this.db.posts.values()].find(
      (p) => p.noteId === data.noteId && p.platform === data.platform,
    );
    const now = this.db.now();
    const post = {
      id: existing?.id ?? crypto.randomUUID(),
      ...data,
      status: "draft",
      postedUrl: null,
      postedAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as AnyPost;
    this.db.posts.set(post.id, post);
    return ok(post);
  }
  async update(id: string, patch: PostPatch): Promise<Result<AnyPost>> {
    const p = this.db.posts.get(id);
    if (!p) return err(new NotFoundError("Post", id));
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const updated = { ...p, ...defined, updatedAt: this.db.now() } as AnyPost;
    this.db.posts.set(id, updated);
    return ok(updated);
  }
}

export class InMemorySubscriberRepository implements ISubscriberReader, ISubscriberWriter {
  constructor(private readonly db: InMemoryStore) {}

  async list() {
    return [...this.db.subscribers.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
  async add(email: string): Promise<Result<void>> {
    if ([...this.db.subscribers.values()].some((s) => s.email === email)) {
      return err(new ConflictError("Already subscribed"));
    }
    const s: Subscriber = {
      id: crypto.randomUUID(),
      email,
      status: "active",
      createdAt: this.db.now(),
    };
    this.db.subscribers.set(s.id, s);
    return ok(undefined);
  }
}

export class InMemoryPlannerSettingsRepository
  implements IPlannerSettingsReader, IPlannerSettingsWriter
{
  constructor(private readonly db: InMemoryStore) {}

  async get() {
    return this.db.planner;
  }
  async scheduleForToken(token: string): Promise<Result<PlannerSchedule>> {
    if (token !== this.db.planner.calendarToken) return err(new NotFoundError("Calendar", token));
    const { dailyTime, youtubeWeekday, reminderMinutes, journeyStart } = this.db.planner;
    return ok({ dailyTime, youtubeWeekday, reminderMinutes, journeyStart });
  }
  async update(schedule: PlannerSchedule): Promise<Result<PlannerSettings>> {
    this.db.planner = { ...this.db.planner, ...schedule };
    return ok(this.db.planner);
  }
  async rotateToken(): Promise<Result<PlannerSettings>> {
    this.db.planner = { ...this.db.planner, calendarToken: crypto.randomUUID() };
    return ok(this.db.planner);
  }
}
