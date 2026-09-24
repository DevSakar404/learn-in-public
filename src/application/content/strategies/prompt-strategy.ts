import type { z } from "zod";
import type { Note } from "@/domain/note/note";
import type { IPlatformContentStrategy } from "@/domain/post/platform-strategy";
import type { Platform, PlatformContent } from "@/domain/post/post";
import { renderNote } from "../prompts/note-input";
import { VOICE, VOICE_VERSION } from "../prompts/shared-voice.v1";

interface PlatformPrompt {
  version: string;
  instructions: string;
}

/** Shared prompt assembly: stable voice + platform rules first (cacheable prefix), the note last. */
export abstract class PromptStrategy<P extends Platform> implements IPlatformContentStrategy<P> {
  abstract readonly platform: P;
  abstract readonly schema: z.ZodType<PlatformContent[P]>;
  protected abstract readonly prompt: PlatformPrompt;

  get promptVersion(): string {
    return `${this.prompt.version}+${VOICE_VERSION}`;
  }

  buildPrompt(note: Note) {
    return { system: `${VOICE}\n\n${this.prompt.instructions}`, prompt: renderNote(note) };
  }
}
