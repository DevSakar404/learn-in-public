# F9: Slide images · post-MVP

**Goal:** turn saved Instagram and LinkedIn drafts into on-brand PNGs with correct, crisp text. No AI images.

**Stories**

- On the Instagram tab: a preview grid of every carousel slide (1080×1350), a download link per slide, and "Download all".
- On the LinkedIn tab: one square card (1200×1200) with the hook and the closing question.
- Pick a preset theme (Midnight, Paper, Terminal, Dusk, Mint, Minimal) or edit background / text / accent colours.

**Files by layer**

- domain: `post/slide-theme.ts` (themes, colour schema, WCAG contrast, `withAlpha`), `post/slides.ts` (`slideDeck`: draft → slides + size)
- app: `admin/drafts/[postId]/images/[index]/route.tsx` (admin-only PNG via `next/og`)
- components: `slide-image.tsx` (the design, Satori flexbox only), `slide-images.tsx` (theme picker, previews, downloads)
- assets: `assets/fonts/Geist-{Regular,Bold}.ttf` (SIL OFL, licence alongside), traced in `next.config.ts`

**Rules**

- Images render the **saved** draft. The UI says so when there are unsaved edits.
- Colours arrive as query params, validated with `slideColorsSchema` (6-digit hex). Invalid → 400.
- The chosen colours are remembered per browser (`localStorage`), a convenience only: no DB column.
- A contrast warning shows below 4.5:1 text/background. Every preset passes (tested).
- Title size scales with length so long LinkedIn hooks still fit.

**Done when**

- [x] `slideDeck` and the themes are unit-tested.
- [x] Signed-out requests to the image route are redirected to login.
- [ ] Checked in the admin UI by the owner (needs a signed-in session).
