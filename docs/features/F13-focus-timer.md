# F13: Focus timer (pomodoro + page sessions) · post-MVP

**Goal:** help readers (and the admin) build a daily study habit with short sessions they can finish. Posts start at 10–12 minutes and grow over time. Design and decisions: [specs/pomodoro-timer.md](../specs/pomodoro-timer.md).

**Stories**

- A reader opens a post. A 25-minute pomodoro starts in the header ("12/25 min · 13:05") and a page session starts under the title ("Focus session · 12 min · 7:00 left"). Both stop while the tab is hidden or unfocused.
- The page session finishes: a chime and a toast ("Session done · Next: <next post>"). The pomodoro finishes: a 5-minute break, which waits until the current page session is done.
- The header menu sets the daily target (25/50/75/100 min), starts a break now, or turns the timer off.
- The admin's minutes add up across their own devices.

**Files by layer**

- db: `notes.session_minutes`, `planner_settings.focus_target_minutes`, `focus_days`, `focus_sync()` ([database.md](../architecture/database.md))
- domain: `focus/focus-timer.ts` (state schema, `tick` reducer, `applySync`), `focus/focus-sync.ts` (sync schema), `focus/focus-repository.ts`, `note/session.ts` (`sessionMinutes`)
- application: `focus-service.ts` (`FocusService.sync`), `NoteService.nextInTopic`, `noteInputSchema.sessionMinutes`
- infra: `SupabaseFocusRepository`
- app: `actions/focus.ts` (`syncFocus`), the public layout, `blog/[slug]/page.tsx`, `blog/[slug]/playground/page.tsx`, the admin layout
- components: `focus/focus-store.ts` (localStorage + ticks), `focus/focus-bar.tsx` (header), `focus/page-timer.tsx`, `focus/focus-sync.ts` + `focus/focus-sync-flag.tsx` (admin sync), the "Session minutes" field in `note-editor.tsx`

**Rules**

- A moment counts **once**, whether one or both timers run, and only in the **focused, visible** tab. Each tick's time belongs to the phase it was spent in. A gap between ticks counts as 5 seconds at most.
- Page session length = the note's "Session minutes" (5–240; reading + playground + exercises). Blank → reading time at 200 words/min, never under 5. A post and its playground share one session (keyed by slug).
- The pomodoro auto-starts on a post (the first one, and again after a break). It never starts on list pages.
- Next post = the next published note in the same topic by `published_at`, oldest first; the last one says "Topic complete".
- The day resets at the **user's local midnight**. The target and the off switch are kept.
- Readers: state lives in `localStorage` (`focus:v1`) only; they never call the server.
- Admin: opening `/admin` sets `focus:sync` + `focus:device` in that browser. It then sends **its own daily total** every minute and on `pagehide`. The server keeps the larger value per (day, device) and returns the other devices' minutes and the target, so retries can't double count and devices can't overwrite each other. `UNAUTHORIZED` clears the flag; minutes stay local. A target changed on a device is sent once and isn't overwritten by an in-flight reply.
- On phones the header shows only "X/target"; the pomodoro countdown is in the menu.

**Done when**

- [x] Reducer acceptance tests (the example day, breaks, sleep gaps, off, corrupt state, sync merge); `FocusService`, `sessionMinutes`, `nextInTopic` and the schemas tested with fakes.
- [x] `pnpm test:db`: `focus_sync` keeps the max per device and sums other devices through RLS; a non-admin is refused.
- [x] Checked in the browser: auto-start, counting only with focus, page done + toast, shared playground session, target, break, off switch, 375px light mode; a reader makes no sync calls; a logged-out flag is cleared.
- [ ] Logged-in sync across two real devices (needs the admin login).
- [ ] Counting continues while a real YouTube embed is playing (checked only with a same-origin iframe).
- [ ] The chime is heard (browser automation can't hear audio).
