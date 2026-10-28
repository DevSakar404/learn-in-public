import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLesson, LessonPlayground } from "@/components/learn/lesson-playground";
import { splitPlayground } from "@/domain/note/lesson";
import { container } from "@/lib/container";

export const revalidate = 3600;

async function lessonFor(slug: string) {
  const note = await container.public.notes().getPublishedBySlug(slug);
  if (!note.ok) return null;
  const { playground } = splitPlayground(note.value.contentMd);
  return hasLesson(playground) ? { note: note.value, playground } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]/playground">): Promise<Metadata> {
  const lesson = await lessonFor((await params).slug);
  if (!lesson) return {};
  return {
    title: `Playground: ${lesson.note.title}`,
    alternates: { canonical: `/blog/${lesson.note.slug}/playground` },
  };
}

/** A lesson's playground: the code on the left, the runnable flow on the right. */
export default async function PlaygroundPage({ params }: PageProps<"/blog/[slug]/playground">) {
  const lesson = await lessonFor((await params).slug);
  if (!lesson) notFound();
  const { note, playground } = lesson;

  return (
    <article data-wide className="space-y-8">
      <header className="space-y-3">
        <Link
          href={`/blog/${note.slug}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to the lesson
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Playground: {note.title}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Read the code on the left, then run it on the right. Each box in the flow is one step of
          the code.
        </p>
      </header>
      <LessonPlayground id={playground} />
    </article>
  );
}
