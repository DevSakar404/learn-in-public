import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { YouTubeEmbed } from "@/components/youtube-embed";
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

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <time dateTime={n.publishedAt!.toISOString()}>
            {formatDate(n.publishedAt!, container.config().timeZone)}
          </time>
          <Link href={`/blog/topic/${n.topic.slug}`}>
            <Badge variant="secondary">{n.topic.name}</Badge>
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{n.title}</h1>
        {n.summary && <p className="text-lg text-muted-foreground">{n.summary}</p>}
      </header>
      {videoId && <YouTubeEmbed videoId={videoId} title={n.title} />}
      <Markdown>{n.contentMd}</Markdown>
    </article>
  );
}
