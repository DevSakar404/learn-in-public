# F5: SEO + feeds · Phase 2

**Goal:** discoverable and shareable.

**Deliverables:** `generateMetadata` per page (title, description, canonical, Open Graph, Twitter card) · `app/sitemap.ts` · `app/robots.ts` · `app/rss.xml/route.ts` (RSS 2.0, hand-written XML, escaped).

**Rules:** absolute URLs come from `SITE_URL`. `/admin` and `/login` are disallowed in robots. The sitemap and RSS list published notes only.

**Done when**

- [ ] The RSS feed validates, and the escaping is unit-tested.
- [ ] The Open Graph tags on a note page show the note's title and summary.
