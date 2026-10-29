# Add a blog post

Follow this file when the admin says **"add blog"** (or "write a blog / note / lesson about X").

A blog post is a **note** in the database. Claude writes its source text as a markdown file in the repo. The admin pastes it into the admin editor and publishes it. **Claude never publishes.**

## 1. Get the input

The admin gives what they learned: raw notes, a topic, links, code. If one of these is missing, ask in one message, then go:

- **Topic.** It must already exist at `/admin/topics` (e.g. "LangChain", "RAG"). Do not invent one.
- **What they learned.** The facts must come from the admin. Do not add claims they did not make. If something looks wrong, say so before writing.

## 2. Create the file

Path: `docs/lessons/NN-<slug>.md`. `NN` is the next number in `docs/lessons/` (`01-langchain-intro.md` is the first). `<slug>` is the title in kebab-case.

Template:

````markdown
<!--
Topic: <existing topic name>
Title: <short title, e.g. "LangChain 2: memory">
Summary: <one or two sentences: what the reader gets>
Session minutes: <optional: reading + playground + exercises>
YouTube: <optional: youtube.com/watch?v=… or youtu.be/… only>
-->

---

## The idea in one line

...

## Think of <a plain analogy>

...

```concepts
Concept | What it is | In the <analogy>
<Term> | <plain definition> | <analogy part>
```

## <How it works / the code>

```ts
// short, runnable, commented
```

## Where people get stuck

- ...

## Say it back

<the whole idea in one sentence>

## What's next

...
````

The comment holds the editor fields. Everything below `---` is the note body.

## 3. Writing rules

- **Feynman style:** one plain idea, an analogy, where people get stuck, then say it back in one sentence.
- Short sentences, everyday words. Spell out an acronym the first time (e.g. "LLM (large language model)").
- **Bold** only the main keywords. On a lesson post they get a soft highlight.
- Code fences always name a language (`ts`, `py`, `bash`). Keep code short and real.
- GitHub-flavoured markdown works: tables, lists, task lists. **Raw HTML is not rendered.**
- Special blocks ([markdown.tsx](../src/components/markdown.tsx)):
  - ` ```concepts `: a header line, then one `term | definition | analogy` line per concept. Exactly 3 cells per line.
  - ` ```diagram `: only an id that exists in `DIAGRAMS` ([lesson-diagrams.tsx](../src/components/learn/lesson-diagrams.tsx)). Today: `greet-node`. Unknown id → shown as plain code, so leave it out.
  - ` ```playground `: only an id that exists in `LESSONS` ([lesson-playground.tsx](../src/components/learn/lesson-playground.tsx)). Today: `greet`. Unknown id → leave it out.
- No new diagram or playground unless the admin asks. That is code work, not a blog post.

## 4. Check before handing over

- [ ] Topic exists, title and summary are filled.
- [ ] Every fact came from the admin or is clearly true. Nothing made up.
- [ ] Each `concepts` line has exactly 3 non-empty cells.
- [ ] `diagram` / `playground` ids are in the lists above, or the blocks are gone.
- [ ] YouTube URL (if any) is `youtube.com/watch?v=` or `youtu.be/`.
- [ ] `pnpm format` run on the file.

## 5. Hand over

Tell the admin the file path, then these steps:

1. Open `/admin/notes/new`.
2. Copy each field from the comment: Topic, Title, Summary, Session minutes, YouTube URL.
3. Paste everything below `---` into **Content (markdown)**. Check the preview.
4. Save as draft, then **Publish** when happy.
5. Optional: generate social drafts from the note ([F6](features/F6-ai-drafts.md)).

Do not commit the file unless the admin asks.
