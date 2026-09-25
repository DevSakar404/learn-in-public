# F10: Content planner · post-MVP

**Goal:** stay consistent. See the streak, what's due today, the weekly YouTube day, and get reminders from your own calendar.

**Stories**

- `/admin/planner`: current + longest streak, "Day N of 90", a 13-week heatmap, today's checklist (note + X/LinkedIn/Instagram posted), this week's YouTube recap date and status, the next 7 days (incl. Day 30/60/90 milestones).
- Edit the schedule: one daily time (site time zone), the YouTube weekday, how early the reminder fires, and the journey start date.
- Subscribe once to a private calendar link (Google/Apple). Rotate it if it leaks.

**Files by layer**

- db: `planner_settings` (single row), `posts.posted_at`, `planner_feed(token)` security-definer function ([database.md](../architecture/database.md))
- domain: `planner/planner-settings.ts` (schedule schema, weekdays, 90-day journey, milestones), `planner/planner-settings-repository.ts`
- application: `planner/planner-service.ts` (overview, schedule, token rotation, feed), `planner/ics.ts` (iCalendar), `streak.ts` (+ `longestStreak`, day-key helpers); `PostService` stamps `postedAt`
- infra: `SupabasePlannerSettingsRepository`
- app: `admin/planner/page.tsx`, `actions/planner.ts`, `calendar/[token]/route.ts` (public, token-keyed)
- components: `planner-heatmap.tsx`, `planner-settings-form.tsx`, `calendar-link.tsx`

**Rules**

- "Posted today" means a draft was **marked posted** today: `postedAt` is set on the change to `posted`, and cleared if it goes back.
- The YouTube recap counts as done if a YouTube draft was marked posted in the 7 days ending on the YouTube day.
- The feed never exposes the token or any content: only the schedule. A wrong token is a 404. `/calendar` is disallowed in robots.
- Calendar apps can only subscribe to a **public** `SITE_URL`: use the deployed site's link. Locally, open the link to download the `.ics` as a one-off import.
- Subscribed calendars refresh on their own schedule (Google can take up to a day).

**Done when**

- [x] Overview, feed and token rotation tested with fakes; `.ics` tested (RRULEs, alarms, milestones, escaping, 75-byte folding).
- [x] RLS: anon can't read `planner_settings`; `planner_feed` only answers the right token.
- [ ] Checked in the admin UI and subscribed from a real calendar (needs the deployed URL).
