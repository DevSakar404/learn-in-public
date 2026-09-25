# Overview

**What:** a "learn in public" site for one admin who is learning AI engineering over 3 months.

1. The admin writes a daily markdown note (the DB is the source of truth).
2. Published notes form a public blog, grouped by topic, with an optional YouTube video.
3. An AI agent drafts posts for X, LinkedIn, Instagram (carousel text) and YouTube (script) from a note.
4. The admin edits, copies and marks drafts as posted. **Nothing is auto-published.**
5. Visitors can subscribe to a newsletter. **No emails are sent** in the MVP.

## Glossary

| Term         | Meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| Note         | A daily learning entry (`draft` or `published`)                              |
| Topic        | A group of notes (e.g. "RAG", "Evals")                                       |
| Post / draft | AI-generated platform content for one note (`draft` → `approved` → `posted`) |
| Platform     | `x`, `linkedin`, `instagram`, `youtube`                                      |
| Strategy     | One class per platform that owns its prompt + output schema                  |
| Streak       | Consecutive days (in `SITE_TIMEZONE`) with a published note                  |

## Features and phase status

| #                                 | Feature                         | Phase    | Status |
| --------------------------------- | ------------------------------- | -------- | ------ |
| —                                 | Setup (tooling, skeleton, docs) | 0        | ✅     |
| [F1](features/F1-admin-auth.md)   | Admin auth                      | 1        | ✅     |
| [F2](features/F2-topics.md)       | Topics                          | 2        | ✅     |
| [F3](features/F3-notes-admin.md)  | Notes admin                     | 2        | ✅     |
| [F4](features/F4-public-blog.md)  | Public blog                     | 2        | ✅     |
| [F5](features/F5-seo-feeds.md)    | SEO + feeds                     | 2        | ✅     |
| [F6](features/F6-ai-drafts.md)    | AI drafts                       | 3        | ✅     |
| [F7](features/F7-newsletter.md)   | Newsletter                      | 4        | ✅     |
| [F8](features/F8-dashboard.md)    | Dashboard                       | 4        | ✅     |
| [F9](features/F9-slide-images.md) | Slide images (themes)           | post-MVP | ✅     |

**Out of scope:** auto-publishing, sending email, multiple users/roles, comments/likes/analytics, AI image generation (templated slide images are F9). See [03-tech-debt.md](03-tech-debt.md) for what comes later.
