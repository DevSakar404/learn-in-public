# Layer: components (`src/components/`)

**Purpose:** presentation only. Components receive plain domain objects as props and mutate only by calling server actions passed in or imported from `app/`.

**Must not import:** `@/lib/container`, `application`, `infrastructure`, Supabase, Mastra.

## Kit
- shadcn/ui (Radix, Nova preset) in `components/ui/`. Add components with `pnpm dlx shadcn@latest add <name>`. Don't hand-edit the generated primitives unless you must.
- Icons: `lucide-react`. Toasts: `sonner`. Dark mode: `next-themes` (the `class` strategy, matching `@custom-variant dark` in `globals.css`).
- Markdown: `components/markdown.tsx` is the one renderer (react-markdown + remark-gfm + rehype-highlight, raw HTML **off**). It's used by both the blog page and the editor preview.

## Forms
`<form action={action}>` + `useActionState` (shows the returned `error` / `fieldErrors`) + `useFormStatus` (disables submit, shows the pending state). There's no client form library.

## State
Server data comes from Server Component props. Filters live in URL search params. Local UI uses `useState`. No global store.

## Accessibility checklist (every component)
- Every input has a `<Label htmlFor>`. Errors are linked with `aria-describedby` and announced (`role="alert"`).
- Everything works by keyboard, with visible focus rings (shadcn defaults, don't remove them).
- Icon-only buttons have an `aria-label`. Destructive actions use `AlertDialog` for confirmation.
- Responsive down to 375px. Contrast is checked in light and dark mode.
