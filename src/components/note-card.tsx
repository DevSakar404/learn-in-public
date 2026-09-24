import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Note } from "@/domain/note/note";

export function NoteCard({ note, date }: { note: Note; date: string }) {
  return (
    <article className="group relative rounded-xl border p-5 transition-colors hover:bg-muted/50">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <time>{date}</time>
        <Badge variant="secondary">{note.topic.name}</Badge>
      </div>
      <h3 className="text-lg font-semibold">
        <Link
          href={`/blog/${note.slug}`}
          className="after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none"
        >
          {note.title}
        </Link>
      </h3>
      {note.summary && <p className="mt-2 text-muted-foreground">{note.summary}</p>}
    </article>
  );
}
