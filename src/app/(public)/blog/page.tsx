import type { Metadata } from "next";
import { NoteCard } from "@/components/note-card";
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">All notes</h1>
      {notes.length ? (
        <div className="grid gap-4">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} date={formatDate(n.publishedAt!, timeZone)} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No notes published yet.</p>
      )}
    </div>
  );
}
