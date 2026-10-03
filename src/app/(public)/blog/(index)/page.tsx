import type { Metadata } from "next";
import { NoteCard, NoteList } from "@/components/note-card";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All notes",
  description: "Every daily note, newest first.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const notes = await container.public.notes().listPublished();
  const { timeZone } = container.config();

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tighter">All notes</h1>
        <p className="text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}, newest first.
        </p>
      </header>
      {notes.length ? (
        <NoteList>
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} date={formatDate(n.publishedAt!, timeZone)} />
          ))}
        </NoteList>
      ) : (
        <p className="text-muted-foreground">No notes published yet.</p>
      )}
    </div>
  );
}
