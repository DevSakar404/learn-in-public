import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteCard } from "@/components/note-card";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await container.public.topics().list()).map((t) => ({ topicSlug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/topic/[topicSlug]">): Promise<Metadata> {
  const topic = await container.public.topics().getBySlug((await params).topicSlug);
  if (!topic.ok) return {};
  return {
    title: topic.value.name,
    description: topic.value.description || `Notes about ${topic.value.name}.`,
    alternates: { canonical: `/blog/topic/${topic.value.slug}` },
  };
}

export default async function TopicPage({ params }: PageProps<"/blog/topic/[topicSlug]">) {
  const topic = await container.public.topics().getBySlug((await params).topicSlug);
  if (!topic.ok) notFound();
  const notes = await container.public.notes().listPublished({ topicId: topic.value.id });
  const { timeZone } = container.config();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Topic</p>
        <h1 className="text-3xl font-bold tracking-tight">{topic.value.name}</h1>
        {topic.value.description && (
          <p className="text-muted-foreground">{topic.value.description}</p>
        )}
      </header>
      {notes.length ? (
        <div className="grid gap-4">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} date={formatDate(n.publishedAt!, timeZone)} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No notes in this topic yet.</p>
      )}
    </div>
  );
}
