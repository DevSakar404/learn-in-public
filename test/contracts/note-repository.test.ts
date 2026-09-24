import { createClient } from "@supabase/supabase-js";
import { describe } from "vitest";
import { SupabaseNoteRepository } from "@/infrastructure/repositories/supabase-note-repository";
import { SupabaseTopicRepository } from "@/infrastructure/repositories/supabase-topic-repository";
import type { Database } from "@/infrastructure/supabase/database.types";
import {
  InMemoryNoteRepository,
  InMemoryStore,
  InMemoryTopicRepository,
} from "../fakes/in-memory-store";
import { runNoteRepositoryContract } from "./note-repository.contract";

describe("note repository contract: in-memory", () => {
  runNoteRepositoryContract(async () => {
    const store = new InMemoryStore();
    return { notes: new InMemoryNoteRepository(store), topics: new InMemoryTopicRepository(store) };
  });
});

// Needs `supabase start`. Uses the secret key (bypasses RLS): test-only, never in the app runtime.
describe.runIf(process.env.SUPABASE_TEST === "1")("note repository contract: Supabase", () => {
  runNoteRepositoryContract(async () => {
    const db = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
    return { notes: new SupabaseNoteRepository(db), topics: new SupabaseTopicRepository(db) };
  });
});
