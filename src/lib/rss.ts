const escapeXml = (s: string) =>
  s.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );

export interface RssItem {
  title: string;
  url: string;
  description: string;
  publishedAt: Date;
  category: string;
}

export function renderRss(
  channel: { title: string; url: string; description: string },
  items: RssItem[],
): string {
  const entries = items
    .map(
      (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.url)}</link>
      <guid isPermaLink="true">${escapeXml(i.url)}</guid>
      <description>${escapeXml(i.description)}</description>
      <category>${escapeXml(i.category)}</category>
      <pubDate>${i.publishedAt.toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.url)}</link>
    <description>${escapeXml(channel.description)}</description>
${entries}
  </channel>
</rss>
`;
}
