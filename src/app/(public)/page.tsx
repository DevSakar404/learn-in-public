import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";
import { NoteCard } from "@/components/note-card";
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
    <div className="space-y-14">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Learning AI engineering in public
        </h1>
        <p className="text-lg text-muted-foreground">
          I&apos;m a full-stack engineer spending 3 months learning AI engineering in depth. Every
          day I write down what I learned: what worked, what didn&apos;t, and what confused me.
          These are those notes.
        </p>
      </section>

      <section aria-labelledby="latest" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="latest" className="text-xl font-semibold">
            Latest notes
          </h2>
          <Link href="/blog" className="text-sm underline-offset-4 hover:underline">
            All notes →
          </Link>
        </div>
        {latest.length ? (
          <div className="grid gap-4">
            {latest.map((n) => (
              <NoteCard key={n.id} note={n} date={formatDate(n.publishedAt!, timeZone)} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No notes yet. The first one is coming soon.</p>
        )}
      </section>

      {topics.length > 0 && (
        <section aria-labelledby="topics" className="space-y-4">
          <h2 id="topics" className="text-xl font-semibold">
            Topics
          </h2>
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/blog/topic/${t.slug}`}
                  className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted"
                >
                  {t.name}
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
