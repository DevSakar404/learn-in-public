import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/link-pending";
import { NewsletterForm } from "@/components/newsletter-form";
import { NoteCard, NoteList } from "@/components/note-card";
import { Button } from "@/components/ui/button";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";

export const revalidate = 3600;

export default async function HomePage() {
  const notes = container.public.notes();
  const [latest, topics] = await Promise.all([
    notes.listPublished({ limit: 5 }),
    container.public.topics().list(),
  ]);
  const { timeZone } = container.config();

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="space-y-6">
        <p className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Daily notes · AI engineering
        </p>
        <h1 className="text-4xl font-semibold tracking-tighter sm:text-5xl">
          Learning AI engineering in public
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          I&apos;m a full-stack engineer spending 3 months learning AI engineering in depth. Every
          day I write down what I learned: what worked, what didn&apos;t, and what confused me.
          These are those notes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="px-4">
            <Link href="/blog">
              Read the notes <ArrowRightIcon data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-4">
            <a href="#newsletter">Get them by email</a>
          </Button>
        </div>
      </section>

      <section aria-labelledby="latest" className="space-y-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="latest"
            className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
          >
            Latest notes
          </h2>
          <Link
            href="/blog"
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            All notes →
          </Link>
        </div>
        {latest.length ? (
          <NoteList>
            {latest.map((n) => (
              <NoteCard key={n.id} note={n} date={formatDate(n.publishedAt!, timeZone)} />
            ))}
          </NoteList>
        ) : (
          <p className="text-muted-foreground">No notes yet. The first one is coming soon.</p>
        )}
      </section>

      {topics.length > 0 && (
        <section aria-labelledby="topics" className="space-y-6">
          <h2
            id="topics"
            className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
          >
            Topics
          </h2>
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/blog/topic/${t.slug}`}
                  className="relative inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors hover:border-foreground/30 hover:bg-muted"
                >
                  {t.name}
                  <LinkPending className="inset-x-4 bottom-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NewsletterForm />
    </div>
  );
}
