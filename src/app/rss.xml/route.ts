import { container } from "@/lib/container";
import { renderRss } from "@/lib/rss";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const { siteUrl } = container.config();
  const notes = await container.public.notes().listPublished({ limit: 50 });
  const xml = renderRss(
    { title: SITE_NAME, url: siteUrl, description: SITE_DESCRIPTION },
    notes.map((n) => ({
      title: n.title,
      url: new URL(`/blog/${n.slug}`, siteUrl).toString(),
      description: n.summary,
      publishedAt: n.publishedAt!,
      category: n.topic.name,
    })),
  );
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
