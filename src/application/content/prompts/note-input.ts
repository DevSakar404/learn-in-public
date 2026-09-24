import type { Note } from "@/domain/note/note";

// ponytail: fixed cap so one huge note can't blow the context/timeout; raise it or summarise first if notes grow.
const MAX_CONTENT_CHARS = 12_000;

/** The variable part of every prompt. Comes last so the stable system prefix can be cached. */
export function renderNote(note: Note): string {
  return [
    `Topic: ${note.topic.name}`,
    `Title: ${note.title}`,
    note.summary && `Summary: ${note.summary}`,
    `Note (markdown):\n<note>\n${note.contentMd.slice(0, MAX_CONTENT_CHARS)}\n</note>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
