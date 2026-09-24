import type { z } from "zod";
import type { Note } from "../note/note";
import type { Platform, PlatformContent } from "./post";

/** One per platform (Open/Closed): add a platform by adding a strategy, not by editing others. */
export interface IPlatformContentStrategy<P extends Platform = Platform> {
  readonly platform: P;
  readonly promptVersion: string;
  readonly schema: z.ZodType<PlatformContent[P]>;
  buildPrompt(note: Note): { system: string; prompt: string };
}
