# Layer: components (`src/components/`)

**Purpose:** presentation only. Components receive plain domain objects as props and mutate only by calling server actions passed in or imported from `app/`.

**Must not import:** `@/lib/container`, `application`, `infrastructure`, Supabase, Mastra.

## Kit

- shadcn/ui (Radix, Nova preset) in `components/ui/`. Add components with `pnpm dlx shadcn@latest add <name>`. Don't hand-edit the generated primitives unless you must.
- Icons: `lucide-react`. Toasts: `sonner`. Dark mode: `next-themes` (the `class` strategy, matching `@custom-variant dark` in `globals.css`).
- Markdown: `components/markdown.tsx` is the one renderer (react-markdown + remark-gfm + rehype-highlight, raw HTML **off**). It's used by both the blog page and the editor preview.

## Look and layout

- **Tokens** (`globals.css`): warm "paper" neutrals plus one accent, `--brand` (`text-brand`, `bg-brand`). Use it for links, small marks and the active nav icon, never as a large fill. Every token pair used for text clears 4.5:1 in both themes.
- **Type:** Geist for text, Geist Mono (`font-mono`) for metadata: dates, topic labels, small uppercase section labels. Headings are `font-semibold tracking-tight` (`tracking-tighter` for page titles).
- **Public pages:** one reading column (`max-w-2xl`) under a sticky, blurred header. Note lists are divided rows (`NoteList` + `NoteCard`), not boxed cards. On phones, `<Markdown bleed>` runs code blocks edge to edge.
- **Admin:** every page starts with `PageHeader` (title, optional badge, description, actions). Navigation is a bottom tab bar on phones and an inline header row from `md` up. Long forms keep their submit button in a bar that sticks above the tab bar on phones (see `note-editor.tsx`).
- **Sticky headers blur through a `before:` pseudo-element**, not `backdrop-blur` on the header itself: a `backdrop-filter` ancestor turns a `position: fixed` child (the tab bar) into one pinned to that ancestor.
- **Phones:** tables hide secondary columns (`hidden sm:table-cell`) and repeat them as a muted line under the first cell. Controls use `text-base md:text-sm` so iOS doesn't zoom on focus. On touch screens, `globals.css` raises buttons and inputs to at least 40px tall.

## Loading states

- Skeletons: the `Skeleton` primitive (`ui/skeleton.tsx`, hand-written because the shadcn registry was unreachable) and the blocks in `skeletons.tsx`. They mirror the real components' sizes and breakpoints so nothing jumps when content arrives. Wrap a whole screen in `LoadingRegion`: it's announced once ("Loading…") and its shapes are `aria-hidden`.
- Pulses stop under `prefers-reduced-motion`.
- Click feedback without a skeleton: `LinkPending` inside a `<Link>`, or the pending bar built into the admin nav. Buttons that run an action show a spinner on the clicked button (`SubmitButton`, `NoteActions`).

## Forms

`<form action={action}>` + `useActionState` (shows the returned `error` / `fieldErrors`) + `useFormStatus` (disables submit, shows the pending state). There's no client form library.

## State

Server data comes from Server Component props. Filters live in URL search params. Local UI uses `useState`. No global store.

## Accessibility checklist (every component)

- Every input has a `<Label htmlFor>`. Errors are linked with `aria-describedby` and announced (`role="alert"`).
- Everything works by keyboard, with visible focus rings (shadcn defaults, don't remove them).
- Icon-only buttons have an `aria-label`. Destructive actions use `AlertDialog` for confirmation.
- Responsive down to 375px. Contrast is checked in light and dark mode.
