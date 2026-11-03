import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageTimer } from "@/components/focus/page-timer";
import { hasLesson, PlaygroundCta } from "@/components/learn/lesson-playground";
import { Markdown } from "@/components/markdown";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { splitPlayground } from "@/domain/note/lesson";
import { sessionMinutes } from "@/domain/note/session";
import { youtubeVideoId } from "@/domain/note/youtube";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await container.public.notes().listPublished()).map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const note = await container.public.notes().getPublishedBySlug((await params).slug);
  if (!note.ok) return {};
  const { title, summary, slug, publishedAt } = note.value;
  return {
    title,
    description: summary,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title,
      description: summary,
      publishedTime: publishedAt?.toISOString(),
    },
    twitter: { card: "summary", title, description: summary },
  };
}

export default async function NotePage({ params }: PageProps<"/blog/[slug]">) {
  const note = await container.public.notes().getPublishedBySlug((await params).slug);
  if (!note.ok) notFound();
  const n = note.value;
  const videoId = n.videoUrl ? youtubeVideoId(n.videoUrl) : null;
  const next = await container.public.notes().nextInTopic(n);

  const { body, playground } = splitPlayground(n.contentMd);

  return (
    <article className="space-y-10">
      <header className="space-y-5">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> All notes
        </Link>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <time dateTime={n.publishedAt!.toISOString()}>
            {formatDate(n.publishedAt!, container.config().timeZone)}
          </time>
          <span aria-hidden>·</span>
          <Link
            href={`/blog/topic/${n.topic.slug}`}
            className="text-brand underline-offset-4 hover:underline"
          >
            {n.topic.name}
          </Link>
        </div>
        <h1 className="text-3xl leading-tight font-semibold tracking-tighter sm:text-5xl sm:leading-[1.1]">
          {n.title}
        </h1>
        {n.summary && (
          <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">{n.summary}</p>
        )}
        <PageTimer
          slug={n.slug}
          minutes={sessionMinutes(n)}
          next={next && { title: next.title, href: `/blog/${next.slug}` }}
        />
      </header>
      {videoId && <YouTubeEmbed videoId={videoId} title={n.title} />}
      <Markdown
        bleed
        className={
          // Lesson posts: **bold** keywords get a soft highlight.
          hasLesson(playground)
            ? "prose-strong:rounded prose-strong:bg-ember-soft prose-strong:px-1 prose-strong:text-ember-text"
            : undefined
        }
      >
        {body}
      </Markdown>
      {hasLesson(playground) && <PlaygroundCta href={`/blog/${n.slug}/playground`} />}
    </article>
  );
}
