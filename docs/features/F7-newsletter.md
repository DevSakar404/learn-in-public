# F7: Newsletter · Phase 4

**Goal:** collect signups (no sending in the MVP).

**Stories:** a visitor subscribes from the public pages. The admin sees the list, a count, and exports CSV.

**Files by layer:** domain `subscriber/` · application `SubscriberService` · infra `SupabaseSubscriberRepository` · app `actions/subscribe.ts`, `admin/subscribers/`, `admin/subscribers/export/route.ts` · components `newsletter-form.tsx` · lib `csv.ts`

**Rules**
- Email is Zod-validated, trimmed and lower-cased.
- Honeypot: a hidden `website` field. If it's filled, return fake success and store nothing.
- A duplicate email returns success with "You're already subscribed". The anon role can only insert, so the duplicate is detected from the unique violation.
- CSV cells are escaped (quotes, commas, newlines, and a leading `=+-@` to prevent formula injection).

**Done when**
- [ ] The duplicate, honeypot and invalid-email paths are unit-tested.
- [ ] The CSV export is admin-only and downloads correctly.
