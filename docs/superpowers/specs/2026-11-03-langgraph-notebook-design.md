# LangGraph series, graph view and practice notebook

**Goal:** learn LangGraph in one week (Tue 3 – Mon 9 Nov 2026). Teach it in public as a new lesson series, and practise it in a Jupyter-style notebook inside the admin area.

**Decided (2026-11-03):**

- **TypeScript**, matching this repo. Python is later (see "Later").
- **Admin only.** The notebook is for the one admin. No learner accounts yet.
- **New series.** LangChain lessons 1–6 stay as they are. A new topic "LangGraph" builds the same six patterns as graphs, so readers can compare plain code with a graph.
- **Notebooks start from a lesson or blank.**
- **Code runs in the browser** (a Web Worker). Model calls go through an admin-only server route that holds the OpenAI key.

This spec covers three parts, built in this order: (1) the LangGraph series, (2) the graph view, (3) the notebook. Each part ships on its own.

## 1. LangGraph series (today)

Six posts under topic "LangGraph", in the F11 lesson style (`docs/add-blog.md`): idea in one line, analogy, `concepts` cards, where people get stuck, say it back, when not to use it. No code in the post; the code lives in the playground.

| File                                        | Title                             | Playground id    | Graph                                                                                         |
| ------------------------------------------- | --------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `docs/lessons/07-langgraph-intro.md`        | LangGraph 1: a simple LLM call    | `lg-greet`       | START → `greet` → END. Introduces state, nodes, edges, `compile`, `invoke`                    |
| `docs/lessons/08-langgraph-chaining.md`     | LangGraph 2: prompt chaining      | `lg-chain`       | `outline` → conditional edge (gate: exactly 3 bullets) → `tweet` or END                       |
| `docs/lessons/09-langgraph-routing.md`      | LangGraph 3: routing              | `lg-route`       | `classify` → conditional edge → `billing` / `technical` / `general` → END                     |
| `docs/lessons/10-langgraph-parallel.md`     | LangGraph 4: parallelization      | `lg-parallel`    | START fans out to `sentiment`, `summary`, `keyPoints` → `join` (fan-in) → END                 |
| `docs/lessons/11-langgraph-orchestrator.md` | LangGraph 5: orchestrator-workers | `lg-orchestrate` | `plan` → `Send` one `worker` per subtask (2–3) → `synthesize` → END. Reducer collects results |
| `docs/lessons/12-langgraph-evaluator.md`    | LangGraph 6: evaluator-optimizer  | `lg-evaluate`    | `write` → `grade` → conditional edge: pass or round 3 → END, else back to `write` (a loop)    |

Same inputs, prompts, Zod schemas, caps and error rules as the LangChain lessons ([2026-10-29 spec](2026-10-29-llm-workflows-design.md)), so the only new idea in each lesson is the graph.

**Code**

| Layer          | File                                           | Change                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain         | `src/domain/learn/workflow.ts`                 | Add the six `lg-*` ids to `WORKFLOW_IDS`. `WorkflowRun` gains `graph?: { mermaid: string; ran: string[] }` (the graph's Mermaid text and the node names that ran, in order)                                                 |
| infrastructure | `src/infrastructure/ai/langgraph-workflows.ts` | The six graphs, each an exported builder taking a model. `LangGraphWorkflows implements IWorkflowRunner`. Steps come from `graph.stream(input, { streamMode: "updates" })`; `mermaid` from `graph.getGraph().drawMermaid()` |
| composition    | `src/lib/container.ts`                         | `LearnService` routes `lg-*` ids to `LangGraphWorkflows`, the rest to `LangChainWorkflows`                                                                                                                                  |
| components     | `src/components/learn/langgraph-lessons.tsx`   | Teaching code, "Match it to the code", "Watch it run" for each of the six; spread into `LESSONS`                                                                                                                            |
| components     | `src/components/learn/workflow-playground.tsx` | When a run has `graph`, show `<GraphView>` above the step flow                                                                                                                                                              |

New dependency: `@langchain/langgraph` 1.6.0. Model, token caps, timeouts, rate limit and honeypot are unchanged.

## 2. Graph view

`src/components/learn/graph-view.tsx`: `<GraphView mermaid ran? />`.

- Renders the Mermaid text with **`mermaid`** 12.2.0, imported dynamically so only pages with a graph load it.
- Highlights the nodes in `ran` by appending a Mermaid `classDef` and `class` line before rendering.
- Follows the site theme (Mermaid `default` / `dark` theme from `next-themes`).
- Render failure → shows the Mermaid text in a code block instead.

Used by the LangGraph playgrounds and by the notebook's `show(graph)`.

## 3. Practice notebook (admin only)

### Pages and flow

- `/admin/notebooks`: your notebooks, newest edit first. "New notebook" makes a blank one.
- `/admin/notebooks/[id]`: the editor.
- LangGraph playground pages show a **"Practise this"** button to the signed-in admin only. It creates a notebook from that lesson's template and opens it.

A lesson template is the lesson's teaching code split into cells at `// ---` lines, followed by a markdown cell "Your turn" and an empty code cell with a TODO. Templates live next to the teaching code in `langgraph-lessons.tsx` (one source for both).

### Data

Migration `notebooks`:

| Column        | Type        | Notes                   |
| ------------- | ----------- | ----------------------- |
| `id`          | uuid pk     |                         |
| `title`       | text        | 1–120 chars             |
| `lesson_slug` | text null   | The lesson it came from |
| `cells`       | jsonb       | `Cell[]`, max 200 cells |
| `created_at`  | timestamptz |                         |
| `updated_at`  | timestamptz |                         |

`Cell = { id, kind: "code" | "markdown", source, output?: CellOutput[] }`. `CellOutput = { type: "log" | "error" | "graph", text }`. Outputs are saved so you can revise without re-running (and re-paying). Each cell's saved output is capped at 20 KB; longer output is cut with a note. RLS: admin only, like `notes`.

| Layer          | File                                                 | What                                                                                                                                    |
| -------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| domain         | `src/domain/notebook/notebook.ts`                    | `Notebook`, `Cell`, `CellOutput`, `INotebookRepository`                                                                                 |
| application    | `src/application/notebook-service.ts`                | `list`, `get`, `create({ title, lessonSlug?, cells })`, `save(id, { title, cells })`, `remove`. Zod schemas for cells. Returns `Result` |
| infrastructure | `src/infrastructure/supabase/notebook-repository.ts` | Supabase repo                                                                                                                           |
| app            | `src/app/actions/notebooks.ts`                       | Thin actions: Zod-parse → `requireAdmin()` → service                                                                                    |
| app            | `src/app/admin/notebooks/page.tsx`, `[id]/page.tsx`  | List and editor pages                                                                                                                   |
| components     | `src/components/notebook/*`                          | Notebook, cell, output, toolbar                                                                                                         |

Autosave: about 1 s after the last edit, via `save`. Delete asks for confirmation.

### Editor

- **CodeMirror 6** (`@uiw/react-codemirror` 4.25 + `@codemirror/lang-javascript` in TypeScript mode) for code cells. Markdown cells edit as text and render with the existing `react-markdown` setup when not focused.
- Keys: Shift+Enter runs the cell and moves to the next. Toolbar: Run all, Stop, Restart, add code/markdown cell, move, delete.
- Each code cell shows a run count (`[3]`) and its output below.

### Kernel (Web Worker)

The "kernel" is a Web Worker that keeps state between cells. Restart = a new worker (all state gone). Stop = terminate the worker, then restart; this is the fix for an infinite loop.

File: `src/infrastructure/notebook-runtime/kernel.worker.ts`. It is client-side code, but it lives in `infrastructure/` because it imports `@langchain/*`, which ESLint only allows there. The component starts it with `new Worker(new URL(..., import.meta.url))`, which is not an import, so the layer rule is unchanged. Record this in `docs/02-decisions.md`.

Running a cell:

1. `transformCell(source)` in `src/infrastructure/notebook-runtime/transform-cell.ts` (pure, unit-tested):
   - **sucrase** (`typescript` + `imports` transforms) strips types and turns `import` into `require(...)`.
   - **acorn** parses the result and finds top-level declared names (`const`, `let`, `var`, `function`, `class`, including destructured names).
   - Wraps the code as an async function so top-level `await` works, and copies the declared names onto the worker's global scope at the end, so later cells see them (Jupyter-style).
2. The worker runs it. `require` only knows: `@langchain/langgraph` (its `/web` browser build), `@langchain/langgraph/prebuilt`, `@langchain/openai`, `@langchain/core/messages`, `@langchain/core/prompts`, `zod`. Anything else throws "`X` isn't available in the notebook. Available: …".
3. `console.log/warn/error` are captured as `log` / `error` output (objects as pretty JSON). A thrown error becomes an `error` output with its message and the first stack lines.
4. Globals ready in every cell: `show(graph)` (posts `graph.getGraph().drawMermaid()` as a `graph` output) and `model` (a `ChatOpenAI` already pointed at the proxy).

New dependencies: `sucrase` 3.35.1, `acorn` 8.19.0, `@uiw/react-codemirror` 4.25.12, `@codemirror/lang-javascript` 6.2.5.

### Model proxy

`POST /api/learn/openai/v1/chat/completions` (`src/app/api/learn/openai/v1/chat/completions/route.ts`):

- `requireAdmin()`; otherwise 401. The worker's same-origin `fetch` sends the session cookie.
- Zod-checks the body: `model` must be `gpt-4o-mini`, `max_tokens` capped at 1000.
- Forwards to OpenAI with the server's `OPENAI_API_KEY` and streams the response back unchanged, so `stream: true` works.
- Logic sits in `src/infrastructure/ai/openai-proxy.ts` behind `IChatProxy` (domain), called through a small application service, per the thin-route rule.

`ChatOpenAI` in the kernel uses `configuration: { baseURL: `${self.location.origin}/api/learn/openai/v1`, dangerouslyAllowBrowser: true }` (the OpenAI client needs an absolute URL and refuses to run in a browser without that flag) and a placeholder key. The real key never reaches the browser.

### Errors

| Case                     | What you see                                                |
| ------------------------ | ----------------------------------------------------------- |
| Cell throws              | Red output in that cell; later cells in "Run all" don't run |
| Unknown import           | "`X` isn't available in the notebook. Available: …"         |
| Syntax error             | Red output with sucrase/acorn's line and column             |
| Save fails               | Toast; the notebook shows "Unsaved" until a save succeeds   |
| Proxy: not signed in     | 401, shown as the cell's error                              |
| Proxy: other model       | 400 "Only gpt-4o-mini is allowed in the notebook"           |
| Missing `OPENAI_API_KEY` | 503 "This demo isn't switched on yet."                      |

## Tests

- `langgraph-workflows.test.ts` with a fake chat model: each graph's node order (`ran`), gate stop, bad route → `invalid_output`, worker cap, evaluator loop stops on pass and at round 3, `mermaid` is returned.
- `transform-cell.test.ts`: types stripped, imports → `require`, top-level names shared (including destructuring), top-level `await`, syntax error reported.
- `notebook-service.test.ts` with a fake repo: create from template, save, cell and output caps, Zod rejects bad cells.
- `openai-proxy` service test: model allow-list, `max_tokens` cap, missing key.
- `pnpm test:db` contract test for the notebook repo and its RLS.
- Manual in the browser: run each LangGraph lesson notebook, Stop on `while (true) {}`, Restart clears state, `show(graph)` draws.

## Risks and limits

- Name sharing between cells is simplified. Rare patterns (labels, `export` in a cell) may not carry across. `// ponytail:` comment in `transform-cell.ts`.
- The browser build of LangGraph has no Node-only features (`fs`, file or SQLite checkpointers). `MemorySaver` works.
- Model calls cost money. Only the admin can make them, only on `gpt-4o-mini`, at most 1000 tokens each. No daily budget.
- `mermaid` is large; it loads only where a graph is shown.

## Week plan

| Day   | Learn                                                                                                        | Build                         |
| ----- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Tue 3 | State, nodes, edges, conditional edges, `Send`, loops                                                        | Part 1 (six lessons) + part 2 |
| Wed 4 | Redo lessons 1–6 in the notebook from memory                                                                 | Part 3 (notebook)             |
| Thu 5 | Tool calling, `ToolNode`, the ReAct loop, hand-built vs the prebuilt agent (`@langchain/langgraph/prebuilt`) | Notebook only                 |
| Fri 6 | Memory: checkpointers (`MemorySaver`), threads, trimming messages                                            | Notebook only                 |
| Sat 7 | Human-in-the-loop: `interrupt`, `Command`, resume, time travel                                               | Notebook only                 |
| Sun 8 | Streaming modes, subgraphs, multi-agent (supervisor, handoffs)                                               | Notebook only                 |
| Mon 9 | Capstone: one small agent end to end                                                                         | Write it up as a post         |

Days 3–7 may become lessons 13+ later, each with its own spec.

## Later (add to `docs/03-tech-debt.md`)

Learner sign-in and per-user notebooks · a per-user model budget or "bring your own key" · exercises with automatic checks · progress tracking · Python via a paid sandbox (E2B / Vercel Sandbox) · TypeScript IntelliSense in the editor (Monaco + LangGraph types) · framework packs (CrewAI, Mastra) on the same notebook.

## Done when

- [ ] Part 1: six LangGraph playgrounds return real runs locally; six lesson files follow `docs/add-blog.md`.
- [ ] Part 2: each playground shows its graph with the ran nodes highlighted, in light and dark.
- [ ] Part 3: create from lesson and blank, run cells with shared state, Stop/Restart, `show(graph)`, autosave and reload shows saved outputs.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass; `pnpm test:db` passes after the migration.
- [ ] F11 and the overview list the new pieces; tech debt lists "Later".
