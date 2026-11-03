import type { Note } from "./note";

export const MIN_SESSION_MINUTES = 5;
export const WORDS_PER_MINUTE = 200;

/** Minutes for one focused session: the admin's number, else reading time, never under 5. */
export function sessionMinutes(note: Pick<Note, "sessionMinutes" | "contentMd">): number {
  if (note.sessionMinutes !== null) return note.sessionMinutes;
  const words = note.contentMd.split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_SESSION_MINUTES, Math.ceil(words / WORDS_PER_MINUTE));
}
