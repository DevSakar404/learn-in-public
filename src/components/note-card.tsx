import Link from "next/link";
import type { Note } from "@/domain/note/note";

/** One row of a note list: date + topic, title, summary. The whole row is the link target. */
export function NoteCard({ note, date }: { note: Note; date: string }) {
  return (
    <article className="group relative grid gap-1.5 py-6 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground sm:flex-col sm:items-start sm:gap-1 sm:pt-1.5">
        <time dateTime={note.publishedAt?.toISOString()}>{date}</time>
        <span aria-hidden className="sm:hidden">
          ·
        </span>
        <span>{note.topic.name}</span>
      </div>
      <div>
        <h3 className="text-lg leading-snug font-semibold tracking-tight transition-colors group-hover:text-brand">
          <Link
            href={`/blog/${note.slug}`}
            className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
          >
            {note.title}
          </Link>
        </h3>
        {note.summary && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
            {note.summary}
          </p>
        )}
      </div>
    </article>
  );
}

/** A divided list of note rows. */
export function NoteList({ children }: { children: React.ReactNode }) {
  return <div className="-mt-6 divide-y divide-border/70">{children}</div>;
}
