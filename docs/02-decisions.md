# Decisions

The log of choices and why they were made. Newest decisions go at the bottom. To change one, add a new entry instead of editing history.

## Product
| Decision | Why |
|---|---|
| Regenerate **replaces** the draft (one row per note+platform), but never one that's `approved`/`posted` | Simple UI. Protects work that's already been reviewed. |
| Streak "day" = calendar day in `SITE_TIMEZONE` | Late-evening posts count for the right day. |
| Duplicate newsletter signup shows "already subscribed" | Friendly, and doesn't leak anything sensitive. |

## Architecture
| Decision | Why |
|---|---|
| `Result` lives in `domain/shared/` (not `lib/`) | Domain interfaces return it, and domain can't import outer layers. |
| Zod is allowed in `domain/` | Platform output schemas are part of the domain contract. Zod is a validation library, not a framework. |
| No DI library: `lib/container.ts` has plain factory functions | Enough for one app. Nothing to learn or debug. |
| Services are built per request | The Supabase server client depends on the request's cookies. |
| Layer boundaries are enforced by ESLint `no-restricted-imports` | Rules that aren't enforced drift. |
| `src/proxy.ts` (Next 16 name for middleware) does an optimistic admin check. Every admin action re-checks with `requireAdmin()` | The proxy isn't a full authorization layer (per the Next.js docs). |
| Env is server-only (no `NEXT_PUBLIC_*`), validated in `instrumentation.ts` at server start | Nothing can leak to the browser. The server fails fast without breaking `typegen`/lint. |

## Data
| Decision | Why |
|---|---|
| `posts.content` is **JSONB** | Every platform's output is structured (thread array, slides, title options). It's validated with the platform's Zod schema on write **and** on read. |
| `posts` also stores `model_used`, `prompt_version`, `usage` | Enough to trace any draft back to its model and prompt, and a baseline for cost/latency. |
| Generated Supabase types + a hand-written mapper, no ORM | The types are free, and the mapper keeps row types out of the domain. |

## Libraries
| Area | Use | Not used (and why) |
|---|---|---|
| UI | shadcn/ui (Radix, Nova preset), Tailwind v4, lucide-react, next-themes, sonner | Component kits: shadcn is copy-in and fully owned. |
| Markdown | react-markdown + remark-gfm + rehype-highlight, one `<Markdown>` component for page + preview; raw HTML off | MDX, editor libraries: a `<textarea>` + preview is enough. |
| Forms | `<form action>` + `useActionState` + `useFormStatus` | react-hook-form: Zod runs on the server anyway. |
| State | Server Components; URL search params for filters; `useState` for local UI | Redux/Zustand/React Query: there's no client cache to manage. |
| Small utils | Hand-written slugify, CSV, RSS XML; `Intl.DateTimeFormat` for time zones | date-fns-tz, feed/csv libraries: a few lines each. |
| LLM | `@mastra/core` Agent; Zod structured output | LangChain, vector DB: no retrieval is needed. |
| LLM memory | **None.** Each generation is stateless: voice prompt + platform prompt + note | Mastra Memory / chat history: one-shot drafts don't need it. |

## LLM
| Decision | Why |
|---|---|
| Prompts are versioned TS modules (`x.v1.ts`) | Pure, type-checked, bundle cleanly on Vercel. The version is stored with each draft. |
| Prompt order: fixed voice + platform instructions first, note last | Gets implicit provider prompt caching for free. |
| Synchronous server action, `Promise.allSettled` across platforms, 45s timeout each, `maxDuration = 60` | Simplest option that isolates each platform's failure. The v2 plan is a background queue. |
| `LLM_MODEL` must be pinned (no `-latest`) | Model upgrades are deliberate changes. |
