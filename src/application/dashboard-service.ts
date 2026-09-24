import type { IClock } from "@/domain/clock";
import type { INoteReader } from "@/domain/note/note-repository";
import type { IPostReader } from "@/domain/post/post-repository";
import type { ISubscriberReader } from "@/domain/subscriber/subscriber-repository";
import { learningStreak } from "./streak";

export interface DashboardStats {
  notesPublished: number;
  draftsPending: number;
  postsPosted: number;
  subscribers: number;
  streak: number;
}

export class DashboardService {
  constructor(
    private readonly notes: INoteReader,
    private readonly posts: IPostReader,
    private readonly subscribers: ISubscriberReader,
    private readonly clock: IClock,
    private readonly timeZone: string,
  ) {}

  // ponytail: loads rows into memory; fine for ~hundreds of notes, move counts to SQL when it isn't (tech debt #9).
  async stats(): Promise<DashboardStats> {
    const [published, postCounts, subscribers] = await Promise.all([
      this.notes.list({ status: "published" }),
      this.posts.countByStatus(),
      this.subscribers.list(),
    ]);
    return {
      notesPublished: published.length,
      draftsPending: postCounts.draft + postCounts.approved,
      postsPosted: postCounts.posted,
      subscribers: subscribers.filter((s) => s.status === "active").length,
      streak: learningStreak(
        published.flatMap((n) => (n.publishedAt ? [n.publishedAt] : [])),
        this.clock.now(),
        this.timeZone,
      ),
    };
  }
}
