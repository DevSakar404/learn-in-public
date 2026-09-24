import type { MetadataRoute } from "next";
import { container } from "@/lib/container";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = container.config();
  const [notes, topics] = await Promise.all([
    container.public.notes().listPublished(),
    container.public.topics().list(),
  ]);
  const url = (path: string) => new URL(path, siteUrl).toString();

  return [
    { url: url("/"), lastModified: notes[0]?.updatedAt },
    { url: url("/blog"), lastModified: notes[0]?.updatedAt },
    ...topics.map((t) => ({ url: url(`/blog/topic/${t.slug}`) })),
    ...notes.map((n) => ({ url: url(`/blog/${n.slug}`), lastModified: n.updatedAt })),
  ];
}
