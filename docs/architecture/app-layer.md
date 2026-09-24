# Layer: app (`src/app/`, `src/proxy.ts`)

**Purpose:** Next.js routes, layouts, server actions, route handlers. **Thin:** validate → authorize → call one service → respond.

**May import:** `@/lib/container`, `domain` types, `components`, `infrastructure/auth` (`requireAdmin`).

## Route map
| Route | Access | Rendering |
|---|---|---|
| `/`, `/blog`, `/blog/topic/[topicSlug]`, `/blog/[slug]` | public | static + revalidated on publish |
| `/rss.xml`, `/sitemap.xml`, `/robots.txt` | public | static + revalidated |
| `/login` | public | dynamic |
| `/admin/**` | admin | dynamic |

## Server action pattern
```ts
"use server";
export async function publishNote(_: State, formData: FormData): Promise<State> {
  const input = idSchema.safeParse(Object.fromEntries(formData));          // 1. validate
  if (!input.success) return { error: "Invalid input" };
  const auth = await requireAdmin();                                        // 2. authorize (always)
  if (!auth.ok) return { error: auth.error.message };
  const result = await (await adminNoteService()).publish(input.data.id);  // 3. one service call
  if (!result.ok) return { error: result.error.message };
  revalidatePath("/blog");                                                  // 4. cache
  return { ok: true };
}
```

## Auth layers
1. `src/proxy.ts`: an optimistic check on `/admin/**`. No session or not an admin → redirect to `/login`. It also refreshes the Supabase session cookie.
2. `requireAdmin()` inside **every** admin action and admin page.
3. RLS in Postgres (the last line of defence).

## Caching
Public pages use the cookie-less client, so they stay static. Publish, unpublish, delete and edit actions call `revalidatePath` for `/`, `/blog`, the note page, its topic page, `/rss.xml` and `/sitemap.xml`.

## Loading and errors
Every route segment with data has a `loading.tsx` and an `error.tsx`. `not-found.tsx` handles unknown slugs.
