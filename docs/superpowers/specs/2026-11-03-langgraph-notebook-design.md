# LangGraph series, graph view and practice notebook

**Goal:** learn LangGraph in one week (Tue 3 – Mon 9 Nov 2026). Teach it in public as a new lesson series, and practise it in a Jupyter-style notebook inside the admin area.

**Decided (2026-11-03):**

- **TypeScript**, matching this repo. Python is later (see "Later").
- **Admin only.** The notebook is for the one admin. No learner accounts yet.
- **New series.** LangChain lessons 1–6 stay as they are. A new topic "LangGraph" builds the same six patterns as graphs, so readers can compare plain code with a graph.
- **Notebooks start from a lesson or blank.**
- **Code runs in the browser** (a Web Worker). Model calls go through an admin-only server route that holds the OpenAI key.

This spec covers three parts, built in this order: (1) the LangGraph series, (2) the graph view, (3) the notebook. Each part ships on its own. Plans: [series + graph view](../plans/2026-11-03-langgraph-series.md), [notebook](../plans/2026-11-04-practice-notebook.md).

**Reference code:** the Python tutorials in `~/Desktop/Learn/langgraph/langgraph-tutorials/` (local clone). We port their examples to TypeScript and write our own text; the tutorials have no prose to copy. The "Sources" table maps each one.

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

**LangGraph.js rules the code follows** (checked against 1.6.0):

- State uses `StateSchema` with zod fields, and `ReducedValue` for a field that needs a reducer. This is the docs' main API; `Annotation.Root` still works but is not taught.
- Node names never equal state keys (LangGraph.js throws). Each graph gets a test that it compiles.
- `addConditionalEdges` always gets a path list, so the drawing shows every branch. `Send` uses `["worker"]`.
- Builder calls are chained (`new StateGraph(S).addNode(...).addEdge(...)`) so node names type-check.
- Nodes return only the keys they change.

**Code**

| Layer          | File                                           | Change                                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain         | `src/domain/learn/workflow.ts`                 | Add `GRAPH_IDS` (the six `lg-*` ids); `WorkflowId` becomes both lists. `WorkflowRun` gains `graph?: { mermaid: string; ran: string[] }` (the graph's Mermaid text and the node names that ran, in order)                                                              |
| infrastructure | `src/infrastructure/ai/langgraph-workflows.ts` | The six graphs, each an exported builder taking a model. `LangGraphWorkflows implements IWorkflowRunner`. Steps come from `graph.stream(input, { streamMode: "updates" })`; `mermaid` from `(await graph.getGraphAsync()).drawMermaid()` (`getGraph()` is deprecated) |
| application    | `src/application/learn-service.ts`             | Constructor gains `graphs: IWorkflowRunner`; `runWorkflow` sends `lg-*` ids to it, the rest to the LangChain runner. Container passes `new LangGraphWorkflows(OPENAI_API_KEY)`                                                                                        |
| components     | `src/components/learn/graph-lessons.tsx`       | Teaching code, "Match it to the code", "Watch it run" for each of the six; spread into `LESSONS`                                                                                                                                                                      |
| components     | `src/components/learn/workflow-playground.tsx` | When a run has `graph`, show `<GraphView>` above the step flow                                                                                                                                                                                                        |

New dependencies: `@langchain/langgraph` 1.6.0 (peers `@langchain/core` ^1.1.48 and zod 4: both met), `mermaid` 12.2.0. Model, token caps, timeouts, rate limit and honeypot are unchanged. The admin creates the "LangGraph" topic and publishes the posts; Claude never publishes (`docs/add-blog.md`).

## 2. Graph view

`src/components/learn/graph-view.tsx`: `<GraphView mermaid ran? />`.

- Renders the Mermaid text with **`mermaid`** 12.2.0, imported dynamically so only pages with a graph load it.
- Highlights the nodes in `ran` by appending a Mermaid `classDef` and `class` line before rendering. That string work is a pure function with a unit test (Vitest runs `.test.ts` in Node only).
- Client only: `import("mermaid")` inside an effect, `initialize({ startOnLoad: false, theme })`, `render(id, text)` with a CSS-safe id.
- Follows the site theme (Mermaid `default` / `dark` theme from `next-themes`).
- Render failure → shows the Mermaid text in a code block instead.

Used by the LangGraph playgrounds and by the notebook's `show(graph)`.

## 3. Practice notebook (admin only)

### Pages and flow

- `/admin/notebooks`: your notebooks, newest edit first. "New notebook" makes a blank one.
- `/admin/notebooks/[id]`: the editor.
- `/admin/notebooks` also has "New from template" for the week templates below.
- LangGraph playground pages show a **"Practise this"** button to the admin only. The playground page is static and can't read the session, so the button shows when the browser's admin flag is set (the same pattern as `FocusSyncFlag`); the server action re-checks with `authorize()`, creates the notebook and opens it.

**Templates (the exercises).** Each is a list of cells, kept as plain strings in `src/domain/notebook/templates.ts` (a separate copy of the lesson code, split into cells), so components stay free of `@langchain` imports. They use the same state API as the lessons (`StateSchema`, `ReducedValue`, `MessagesValue`):

- One per LangGraph lesson: a no-LLM warm-up graph, the lesson's graph split into cells, then "Your turn" with TODO cells. Each TODO states what a correct answer prints.
- Four week templates: `tools`, `memory`, `hitl`, `subgraphs` (see "Sources").
- A markdown cell credits the source tutorial.

### Data

Migration `notebooks`:

| Column       | Type        | Notes                     |
| ------------ | ----------- | ------------------------- |
| `id`         | uuid pk     |                           |
| `title`      | text        | 1–120 chars               |
| `template`   | text null   | The template it came from |
| `cells`      | jsonb       | `Cell[]`, max 200 cells   |
| `created_at` | timestamptz |                           |
| `updated_at` | timestamptz |                           |

`Cell = { id, kind: "code" | "markdown", source, output?: CellOutput[] }`. `CellOutput = { type: "log" | "error" | "graph", text }`. Outputs are saved so you can revise without re-running (and re-paying). Each cell's saved output is capped at 20 KB; longer output is cut with a note. RLS: admin only, like `notes`.

| Layer          | File                                                              | What                                                                                                                                  |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| domain         | `src/domain/notebook/notebook.ts`                                 | `Notebook`, `Cell`, `CellOutput`, `INotebookRepository`                                                                               |
| application    | `src/application/notebook-service.ts`                             | `list`, `get`, `create({ title, template?, cells })`, `save(id, { title, cells })`, `remove`. Zod schemas for cells. Returns `Result` |
| infrastructure | `src/infrastructure/repositories/supabase-notebook-repository.ts` | Supabase repo                                                                                                                         |
| app            | `src/app/actions/notebooks.ts`                                    | Thin actions: Zod-parse → `authorize()` → service (pages use `requireAdminPage()`)                                                    |
| app            | `src/app/admin/notebooks/page.tsx`, `[id]/page.tsx`               | List and editor pages                                                                                                                 |
| components     | `src/components/notebook/*`                                       | Notebook, cell, output, toolbar                                                                                                       |

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
   - **sucrase** (`transforms: ["typescript"]`, `keepUnusedImports: true`) strips types only. Its `imports` transform is not used: it renames imported names to `_x.a`, which breaks sharing between cells.
   - **acorn** (`ecmaVersion: "latest"`, `sourceType: "module"`) parses the result. Each `import` is rewritten to `const { a, b: c } = __require("x")`; top-level names (imports, `const`/`let`/`var` including destructuring, `function`, `class`) are collected. `export` is rejected with a clear error.
   - Wraps the code as an async function so top-level `await` works, and copies the declared names onto the worker's global scope at the end, so later cells see them (Jupyter-style).
2. The worker runs it. `__require` only knows: `@langchain/langgraph` (mapped to its `/web` browser build), `@langchain/langgraph/prebuilt`, `@langchain/core/tools`, `@langchain/openai`, `@langchain/core/messages`, `@langchain/core/prompts`, `zod`. Anything else throws "`X` isn't available in the notebook. Available: …".
3. `console.log/warn/error` are captured as `log` / `error` output (objects as pretty JSON). A thrown error becomes an `error` output with its message and the first stack lines.
4. Globals ready in every cell: `show(graph, { xray? })` (posts `(await graph.getGraphAsync({ xray })).drawMermaid()` as a `graph` output) and `model` (a `ChatOpenAI` already pointed at the proxy, `maxTokens: 1000`).

**Browser build limits** (`@langchain/langgraph/web` has no AsyncLocalStorage): `interrupt()` throws "outside the context of a graph", so the `hitl` template uses `compile({ interruptBefore })` + `updateState` + `invoke(null, config)`; a smoke cell on Wednesday confirms this. Nested calls (subgraphs, `streamMode: "messages"`) must pass the node's `config` on.

New dependencies: `sucrase` 3.35.1, `acorn` 8.19.0, `@uiw/react-codemirror` 4.25.12, `@codemirror/lang-javascript` 6.2.5.

### Model proxy

`POST /api/learn/openai/v1/chat/completions` (`src/app/api/learn/openai/v1/chat/completions/route.ts`):

- `authorize()`; otherwise 401. `src/proxy.ts` only matches `/admin`, so the route checks itself. The worker's same-origin `fetch` sends the session cookie.
- Zod-checks the body loosely: `model` must be `gpt-4o-mini`; `max_tokens` / `max_completion_tokens` capped at 1000 (set to 1000 if missing). Everything else passes through, including `tools`, `tool_choice`, tool-role messages and `stream`, so Thursday's tool lessons work.
- Forwards to OpenAI with the server's `OPENAI_API_KEY` and streams the response back unchanged, so `stream: true` works.
- Logic sits in `src/infrastructure/ai/openai-proxy.ts` behind `IChatProxy` (domain), called through a small application service, per the thin-route rule.

`ChatOpenAI` in the kernel uses `configuration: { baseURL: new URL("/api/learn/openai/v1", self.location.origin).href }` (the OpenAI client needs an absolute URL; browser use is already allowed by `@langchain/openai`) and a non-empty placeholder `apiKey` (an empty one throws). The real key never reaches the browser.

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
- `transform-cell.test.ts`: types stripped, imports → `__require`, top-level names shared (including destructuring), top-level `await`, syntax error reported.
- `notebook-service.test.ts` with a fake repo: create from template, save, cell and output caps, Zod rejects bad cells.
- `openai-proxy` service test: model allow-list, `max_tokens` cap, missing key.
- `pnpm test:db` contract test for the notebook repo and its RLS.
- Manual in the browser: run each LangGraph lesson notebook, Stop on `while (true) {}`, Restart clears state, `show(graph)` draws.

## Risks and limits

- Name sharing between cells is simplified. Rare patterns (labels, `export` in a cell) may not carry across. `// ponytail:` comment in `transform-cell.ts`.
- The browser build of LangGraph has no Node-only features (`fs`, file or SQLite checkpointers) and no `interrupt()` (see Kernel). `MemorySaver` works. The prebuilt `createReactAgent` is deprecated (moved to the `langchain` package); the `tools` template builds the loop by hand with `ToolNode` + `toolsCondition`.
- Stop kills the worker, and the `MemorySaver` inside it. The `memory` template shows crash-and-resume with a node that throws once instead.
- Turbopack's handling of `new Worker(new URL(...))` is unverified; the notebook plan starts with a smoke test.
- `/api` paths don't refresh the session cookie. A long session may get a 401 until an `/admin` page is reloaded.
- Model calls cost money. Only the admin can make them, only on `gpt-4o-mini`, at most 1000 tokens each. No daily budget.
- `mermaid` is large; it loads only where a graph is shown.

## Week plan

| Day   | Learn                                                                                                            | Build                         |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Tue 3 | State, nodes, edges, conditional edges, `Send`, loops                                                            | Part 1 (six lessons) + part 2 |
| Wed 4 | Redo lessons 1–6 in the notebook from memory                                                                     | Part 3 (notebook)             |
| Thu 5 | Tool calling, `ToolNode`, the ReAct loop, hand-built vs the prebuilt agent (`@langchain/langgraph/prebuilt`)     | Notebook only                 |
| Fri 6 | Memory: checkpointers (`MemorySaver`), threads, trimming messages                                                | Notebook only                 |
| Sat 7 | Human-in-the-loop: `interruptBefore`, `updateState`, resume, time travel (`interrupt` + `Command` on the server) | Notebook only                 |
| Sun 8 | Streaming modes, subgraphs, multi-agent (supervisor and handoffs by hand with `Command({ goto })`)               | Notebook only                 |
| Mon 9 | Capstone: one small agent end to end                                                                             | Write it up as a post         |

Days 3–7 may become lessons 13+ later, each with its own spec.

## Sources

| Tutorial                                                   | Used for                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `1_bmi_workflow`, `2_simple_llm_workflow`                  | `lg-greet`: a no-LLM first graph (80 kg / 1.73 m → 26.73, Overweight), then one LLM call        |
| `3_prompt_chaining`                                        | `lg-chain`: outline → content; our 3-bullet gate is added as a conditional edge                 |
| `6_quadratic_equation_workflow`, `7_review_reply_workflow` | `lg-route`: three-way router with no LLM, then an LLM classifier with Zod enums                 |
| `4_batsman_workflow`, `5_UPSC_essay_workflow`              | `lg-parallel`: fan-out/fan-in with no LLM, then parallel judges and a list reducer              |
| none                                                       | `lg-orchestrate`: LangGraph.js `Send` docs                                                      |
| `8_X_post_generator`                                       | `lg-evaluate`: write → grade loop with a round cap and a history reducer                        |
| `9_basic_chatbot`, `11_tools`, `chatbot_without_hitl`      | `tools` template: messages state, fake calculator and stock tools, `ToolNode`, `toolsCondition` |
| `10_persistence`                                           | `memory` template: `MemorySaver`, threads, `getStateHistory`, `updateState` fork, resume        |
| `14_hitl`, `chatbot_with_hitl`                             | `hitl` template: approve a stock purchase before it runs                                        |
| `15_subgraphs`, `15_subgraph_shared`                       | `subgraphs` template: mapped vs shared state, `show(graph, { xray: true })`                     |
| `12_mcp`, `13_rag`                                         | Later: need an MCP bridge, an embeddings route and a vector store                               |

## Later (add to `docs/03-tech-debt.md`)

Learner sign-in and per-user notebooks · a per-user model budget or "bring your own key" · exercises with automatic checks · progress tracking · Python via a paid sandbox (E2B / Vercel Sandbox) · TypeScript IntelliSense in the editor (Monaco + LangGraph types) · an `/embeddings` route and in-memory vectors for RAG · an MCP bridge · real search and stock tools through a server-side tool proxy · a Supabase checkpointer · framework packs (CrewAI, Mastra) on the same notebook.

## Done when

- [ ] Part 1: six LangGraph playgrounds return real runs locally; six lesson files follow `docs/add-blog.md`.
- [ ] Part 2: each playground shows its graph with the ran nodes highlighted, in light and dark.
- [ ] Part 3: create from lesson, week template and blank, run cells with shared state, Stop/Restart, `show(graph)`, autosave and reload shows saved outputs.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass; `pnpm test:db` passes after the migration.
- [ ] F11 and the overview list the new pieces; tech debt lists "Later".
