# F8: Dashboard · Phase 4

**Goal:** see progress at a glance on `/admin`.

**Shows:** notes published · drafts pending (posts in `draft` or `approved`) · posts marked posted · active subscribers · current learning streak.

**Files by layer:** application `DashboardService` · app `admin/page.tsx`

**Rules (streak)**
- A day = a calendar date of `published_at` in `SITE_TIMEZONE` (`Intl.DateTimeFormat`).
- Count consecutive days back from today. If today has no note yet, start from yesterday, so the streak isn't broken until the day ends.

**Done when**
- [ ] The streak is unit-tested with `FixedClock` across: no notes, a gap, today empty, a time zone boundary.
