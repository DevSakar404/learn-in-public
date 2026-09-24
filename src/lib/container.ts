import "server-only";
import { ContentGenerationService } from "@/application/content-generation-service";
import { defaultStrategies } from "@/application/content/strategies/registry";
import { DashboardService } from "@/application/dashboard-service";
import { NoteService } from "@/application/note-service";
import { PostService } from "@/application/post-service";
import { SlugService } from "@/application/slug-service";
import { SubscriberService } from "@/application/subscriber-service";
import { TopicService } from "@/application/topic-service";
import type { IClock } from "@/domain/clock";
import { MastraContentGenerator } from "@/infrastructure/ai/mastra-content-generator";
import { modelConfig } from "@/infrastructure/ai/model-provider";
import { SupabaseAuthGateway } from "@/infrastructure/auth/supabase-auth-gateway";
import { getEnv } from "@/infrastructure/config/env";
import { SupabaseNoteRepository } from "@/infrastructure/repositories/supabase-note-repository";
import { SupabasePostRepository } from "@/infrastructure/repositories/supabase-post-repository";
import { SupabaseSubscriberRepository } from "@/infrastructure/repositories/supabase-subscriber-repository";
import { SupabaseTopicRepository } from "@/infrastructure/repositories/supabase-topic-repository";
import { createSupabasePublicClient } from "@/infrastructure/supabase/public-client";
import { createSupabaseServerClient, type Db } from "@/infrastructure/supabase/server-client";
import { SystemClock } from "@/infrastructure/system-clock";

/**
 * Composition root: the only place that instantiates concrete classes.
 * `admin.*` use the cookie session (dynamic routes); `public.*` use the cookie-less client (static routes).
 * See docs/architecture/composition.md.
 */
const clock: IClock = new SystemClock();
const slugs = new SlugService();
const strategies = defaultStrategies();
let generator: MastraContentGenerator | undefined;
const contentGenerator = () => (generator ??= new MastraContentGenerator(modelConfig(getEnv())));

function repositories(db: Db) {
  return {
    notes: new SupabaseNoteRepository(db),
    topics: new SupabaseTopicRepository(db),
    posts: new SupabasePostRepository(db),
    subscribers: new SupabaseSubscriberRepository(db),
  };
}

const noteService = (db: Db) => {
  const { notes } = repositories(db);
  return new NoteService(notes, notes, slugs, clock);
};
const topicService = (db: Db) => {
  const { topics } = repositories(db);
  return new TopicService(topics, topics, slugs);
};
const subscriberService = (db: Db) => {
  const { subscribers } = repositories(db);
  return new SubscriberService(subscribers, subscribers);
};

export const container = {
  config: () => ({ siteUrl: getEnv().SITE_URL, timeZone: getEnv().SITE_TIMEZONE }),

  auth: async () => new SupabaseAuthGateway(await createSupabaseServerClient()),

  admin: {
    notes: async () => noteService(await createSupabaseServerClient()),
    topics: async () => topicService(await createSupabaseServerClient()),
    subscribers: async () => subscriberService(await createSupabaseServerClient()),
    posts: async () => {
      const { posts } = repositories(await createSupabaseServerClient());
      return new PostService(posts, posts);
    },
    generation: async () => {
      const r = repositories(await createSupabaseServerClient());
      return new ContentGenerationService(
        r.notes,
        r.posts,
        r.posts,
        contentGenerator(),
        strategies,
      );
    },
    dashboard: async () => {
      const r = repositories(await createSupabaseServerClient());
      return new DashboardService(r.notes, r.posts, r.subscribers, clock, getEnv().SITE_TIMEZONE);
    },
  },

  public: {
    notes: () => noteService(createSupabasePublicClient()),
    topics: () => topicService(createSupabasePublicClient()),
    subscribers: () => subscriberService(createSupabasePublicClient()),
  },
};
