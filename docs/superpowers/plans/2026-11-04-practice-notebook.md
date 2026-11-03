# Practice Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin-only, Jupyter-style notebook at `/admin/notebooks` where the admin writes and runs LangGraph.js (TypeScript) cells in the browser, sees outputs and graph drawings, and finds everything saved for later revision.

**Architecture:** Notebooks are rows in a new `notebooks` table (cells as JSONB, admin-only RLS), reached through the usual domain → application → repository layers and thin server actions. Code runs in a module Web Worker (the "kernel") that strips types with sucrase, rewrites imports and shares top-level names via acorn, and exposes a fixed set of packages. Model calls from the worker go to an admin-only route handler that adds the server's OpenAI key and only allows `gpt-4o-mini` with capped tokens.

**Tech Stack:** Next.js 16.3.6 (Turbopack), React 19.2.8, Supabase, Zod 4, Vitest 5, `@langchain/langgraph` 1.6.0 (web build), `@langchain/openai` 1.7.1, `sucrase` 3.35.1, `acorn` 8.19.0, `@uiw/react-codemirror` 4.25.12, `@codemirror/lang-javascript` 6.2.5, `mermaid` 12.2.0 (via `GraphView`).

**Spec:** [2026-11-03-langgraph-notebook-design.md](../specs/2026-11-03-langgraph-notebook-design.md), part 3. **Assumes plan 1 has landed:** `@langchain/langgraph` 1.6.0 and `mermaid` 12.2.0 installed, `src/components/learn/graph-view.tsx` exporting `GraphView({ mermaid: string; ran?: string[] })`, and the six `lg-*` lessons in `LESSONS` (`src/components/learn/lesson-playground.tsx`).

## Global Constraints

- Layers: `domain ← application ← infrastructure ← lib (container) ← app ← components`. Components never import `@/infrastructure/*`, `@/application/*`, `@/lib/container` or `@langchain/*` (ESLint). Shared types between the worker and the UI live in `src/domain/notebook/`.
- Admin pages call `requireAdminPage()`; server actions and the route handler call `authorize()` from `src/app/_lib/auth.ts`. There is no `requireAdmin()`.
- Services return `Result<T, DomainError>`; they never throw expected failures. Actions Zod-parse first, then `authorize()`, then one service call.
- No `any`. `strict` + `noUncheckedIndexedAccess` are on.
- The OpenAI key never reaches the browser. The kernel's `ChatOpenAI` uses `apiKey: "notebook-proxy"` (a dummy) and the absolute base URL `new URL("/api/learn/openai/v1", self.location.origin).href`.
- Notebook model: `gpt-4o-mini` only. Tokens per call: at most 1000 (`max_tokens` injected as 1000 when missing). `n` must be 1 or absent.
- Limits: 200 cells per notebook, 50 000 characters per cell source, 20 000 characters of output per cell, 200 output entries per cell, title 1–120 characters.
- Kernel import allow-list, exactly: `@langchain/langgraph` (mapped to the `/web` build), `@langchain/langgraph/web`, `@langchain/langgraph/prebuilt`, `@langchain/openai`, `@langchain/core/messages`, `@langchain/core/prompts`, `@langchain/core/tools`, `zod`. Anything else: "`X` isn't available in the notebook. Available: …".
- Browser limits that templates must respect: `interrupt()` throws in the web build (no AsyncLocalStorage), so human-in-the-loop uses `compile({ interruptBefore })`; pass `config` into nested `invoke` calls; no outside HTTP APIs (fake tools only); `MemorySaver` only.
- State API in every template, same as plan 1: `new StateSchema({ ... })` with Zod fields (inputs plain, node-filled fields with `.default(...)`), `new ReducedValue(z.array(...).default(() => []), { reducer: (current, next) => current.concat(next) })` for merged fields, `MessagesValue` for chat messages, `typeof X.State` for node parameter types, `{ input: WorkerJob }` for `Send` workers. Never `Annotation.Root` or `MessagesAnnotation`. Node names never reuse state keys.
- Template code cells are written with the `code` tagged template (raw strings): no backticks and no `${` inside cell code. Use `+` to join strings.
- Files are `kebab-case.ts`; interfaces start with `I`. Commits are small and conventional, and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Every phase ends green: `pnpm lint && pnpm typecheck && pnpm test`. Run `pnpm test:db` after the migration task.

---

## File map

| File                                                              | Responsibility                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/domain/notebook/notebook.ts`                                 | `Cell`, `CellOutput`, `Notebook`, `NotebookSummary`, Zod schemas, limits, `appendOutput`        |
| `src/domain/notebook/notebook-repository.ts`                      | `INotebookRepository`, `NewNotebook`, `NotebookPatch`                                           |
| `src/domain/notebook/kernel-protocol.ts`                          | `KernelRequest`, `KernelEvent` (worker ↔ UI messages)                                           |
| `src/domain/notebook/chat-proxy.ts`                               | `IChatProxy`, `NOTEBOOK_MODEL`, `NOTEBOOK_MAX_TOKENS`                                           |
| `src/domain/notebook/templates.ts`                                | `TEMPLATE_IDS`, `TemplateId`, `isTemplateId`, `TEMPLATES` (all starter notebooks and exercises) |
| `supabase/migrations/20261104090000_notebooks.sql`                | Table, trigger, RLS                                                                             |
| `src/infrastructure/repositories/supabase-notebook-repository.ts` | Supabase repo                                                                                   |
| `src/infrastructure/repositories/mappers.ts`                      | `toNotebook`, `toNotebookSummary` (added)                                                       |
| `src/application/notebook-service.ts`                             | `NotebookService`, `notebookSaveSchema`, `newNotebookSchema`                                    |
| `src/application/notebook-model-service.ts`                       | `NotebookModelService`, `chatRequestSchema`                                                     |
| `src/infrastructure/ai/openai-proxy.ts`                           | `OpenAIProxy implements IChatProxy`                                                             |
| `src/app/api/learn/openai/v1/chat/completions/route.ts`           | Admin-only proxy route                                                                          |
| `src/infrastructure/notebook-runtime/transform-cell.ts`           | Pure: TS → runnable body + shared names                                                         |
| `src/infrastructure/notebook-runtime/kernel.worker.ts`            | The kernel (Web Worker)                                                                         |
| `src/app/actions/notebooks.ts`                                    | `createNotebook`, `saveNotebook`, `deleteNotebook`                                              |
| `src/app/admin/notebooks/page.tsx`, `[id]/page.tsx`               | List and editor pages                                                                           |
| `src/components/notebook/use-kernel.ts`                           | Starts/stops the worker, runs cells                                                             |
| `src/components/notebook/code-editor.tsx`                         | CodeMirror with Shift+Enter                                                                     |
| `src/components/notebook/cell-outputs.tsx`                        | Renders outputs (log, error, graph)                                                             |
| `src/components/notebook/notebook-cell.tsx`                       | One cell: toolbar, editor, outputs                                                              |
| `src/components/notebook/notebook-editor.tsx`                     | The notebook: title, cells, run all, stop, restart, autosave                                    |
| `src/components/notebook/practise-button.tsx`                     | "Practise this" on lesson playgrounds                                                           |
| `test/fakes/in-memory-store.ts`, `test/fakes/setup.ts`            | `InMemoryNotebookRepository`, wiring                                                            |
| `test/contracts/notebook-repository.test.ts`                      | RLS + repo against local Supabase                                                               |

---

### Task 1: Notebook domain model

**Files:**

- Create: `src/domain/notebook/notebook.ts`
- Create: `src/domain/notebook/notebook-repository.ts`
- Create: `src/domain/notebook/kernel-protocol.ts`
- Create: `src/domain/notebook/templates.ts` (ids only in this task; content in Task 6)
- Test: `src/domain/notebook/notebook.test.ts`

**Interfaces:**

- Produces: `MAX_CELLS = 200`, `OUTPUT_CAP = 20_000`, `MAX_OUTPUTS = 200`, `CUT_NOTE`, `cellOutputSchema`, `cellSchema`, `cellsSchema`, `type CellOutput = { type: "log" | "error" | "graph"; text: string }`, `type Cell = { id: string; kind: "code" | "markdown"; source: string; output?: CellOutput[] }`, `interface Notebook { id; title; template: TemplateId | null; cells: Cell[]; createdAt: Date; updatedAt: Date }`, `type NotebookSummary = Omit<Notebook, "cells">`, `appendOutput(outputs: CellOutput[], next: CellOutput): CellOutput[]`.
- Produces: `interface INotebookRepository { list(): Promise<NotebookSummary[]>; findById(id: string): Promise<Result<Notebook>>; create(data: NewNotebook): Promise<Result<Notebook>>; update(id: string, patch: NotebookPatch): Promise<Result<Notebook>>; delete(id: string): Promise<Result<void>> }`, `NewNotebook = { title: string; template: TemplateId | null; cells: Cell[] }`, `NotebookPatch = { title: string; cells: Cell[] }`.
- Produces: `KernelRequest = { type: "run"; runId: number; source: string }`, `KernelEvent = { type: "output"; runId: number; output: CellOutput } | { type: "done"; runId: number; ok: boolean }`.
- Produces: `TEMPLATE_IDS`, `TemplateId`, `isTemplateId(id: string): id is TemplateId`.

- [ ] **Step 1: Write the failing test**

`src/domain/notebook/notebook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CUT_NOTE, MAX_OUTPUTS, OUTPUT_CAP, appendOutput, cellsSchema } from "./notebook";

const log = (text: string) => ({ type: "log" as const, text });

describe("appendOutput", () => {
  it("joins consecutive log lines into one entry", () => {
    expect(appendOutput([log("a")], log("b"))).toEqual([log("a\nb")]);
  });

  it("keeps errors and graphs as their own entries", () => {
    const out = appendOutput([log("a")], { type: "error", text: "boom" });
    expect(out).toEqual([log("a"), { type: "error", text: "boom" }]);
  });

  it("cuts output at the cap, adds one note, then ignores the rest", () => {
    const big = "x".repeat(OUTPUT_CAP - 10);
    const cut = appendOutput([log(big)], { type: "error", text: "y".repeat(50) });
    expect(cut.at(-1)).toEqual(CUT_NOTE);
    expect(cut.reduce((n, o) => n + o.text.length, 0)).toBeLessThanOrEqual(
      OUTPUT_CAP + CUT_NOTE.text.length,
    );
    expect(appendOutput(cut, log("more"))).toBe(cut);
  });

  it("never splits a graph: it is dropped with the note", () => {
    const out = appendOutput([log("x".repeat(OUTPUT_CAP - 5))], {
      type: "graph",
      text: "graph TD;\n a-->b",
    });
    expect(out).toEqual([log("x".repeat(OUTPUT_CAP - 5)), CUT_NOTE]);
  });

  it("stops at the entry limit", () => {
    let outputs: ReturnType<typeof appendOutput> = [];
    for (let i = 0; i < MAX_OUTPUTS + 50; i++) {
      outputs = appendOutput(outputs, { type: i % 2 ? "log" : "error", text: "e" });
    }
    expect(outputs.length).toBeLessThanOrEqual(MAX_OUTPUTS);
    expect(outputs.at(-1)).toEqual(CUT_NOTE);
  });
});

describe("cellsSchema", () => {
  it("accepts code and markdown cells with outputs", () => {
    const cells = [
      { id: "a", kind: "code", source: "1 + 1", output: [log("2")] },
      { id: "b", kind: "markdown", source: "# Hi" },
    ];
    expect(cellsSchema.safeParse(cells).success).toBe(true);
  });

  it("rejects an unknown kind and more than 200 cells", () => {
    expect(cellsSchema.safeParse([{ id: "a", kind: "sql", source: "" }]).success).toBe(false);
    const many = Array.from({ length: 201 }, (_, i) => ({
      id: String(i),
      kind: "code",
      source: "",
    }));
    expect(cellsSchema.safeParse(many).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/domain/notebook/notebook.test.ts`
Expected: FAIL with "Failed to resolve import "./notebook"".

- [ ] **Step 3: Write the domain files**

`src/domain/notebook/notebook.ts`:

```ts
import { z } from "zod";
import type { TemplateId } from "./templates";

export const MAX_CELLS = 200;
/** Characters of output kept per cell (outputs are saved, so revising doesn't re-run and re-pay). */
export const OUTPUT_CAP = 20_000;
export const MAX_OUTPUTS = 200;

export const cellOutputSchema = z.object({
  type: z.enum(["log", "error", "graph"]),
  text: z.string().max(OUTPUT_CAP),
});
export type CellOutput = z.infer<typeof cellOutputSchema>;

export const cellSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["code", "markdown"]),
  source: z.string().max(50_000),
  output: z.array(cellOutputSchema).max(MAX_OUTPUTS).optional(),
});
export type Cell = z.infer<typeof cellSchema>;

export const cellsSchema = z.array(cellSchema).max(MAX_CELLS, "A notebook holds at most 200 cells");

export interface Notebook {
  id: string;
  title: string;
  /** The starter it was made from, or null for a blank notebook. */
  template: TemplateId | null;
  cells: Cell[];
  createdAt: Date;
  updatedAt: Date;
}

export type NotebookSummary = Omit<Notebook, "cells">;

export const CUT_NOTE: CellOutput = { type: "log", text: "… output cut here (20 KB per cell)" };

/** Adds one output to a cell: joins log lines, cuts at OUTPUT_CAP / MAX_OUTPUTS with one note. */
export function appendOutput(outputs: CellOutput[], next: CellOutput): CellOutput[] {
  const last = outputs.at(-1);
  if (last?.text === CUT_NOTE.text) return outputs;
  if (outputs.length >= MAX_OUTPUTS - 1) return [...outputs, CUT_NOTE];
  const room = OUTPUT_CAP - outputs.reduce((n, o) => n + o.text.length, 0);
  const merge = last?.type === "log" && next.type === "log";
  if (next.text.length + (merge ? 1 : 0) > room) {
    const head =
      next.type === "graph" || room <= 1 ? [] : [{ ...next, text: next.text.slice(0, room - 1) }];
    return [...outputs, ...head, CUT_NOTE];
  }
  if (merge && last)
    return [...outputs.slice(0, -1), { type: "log", text: last.text + "\n" + next.text }];
  return [...outputs, next];
}
```

`src/domain/notebook/notebook-repository.ts`:

```ts
import type { Result } from "../shared/result";
import type { Cell, Notebook, NotebookSummary } from "./notebook";
import type { TemplateId } from "./templates";

export interface NewNotebook {
  title: string;
  template: TemplateId | null;
  cells: Cell[];
}

export interface NotebookPatch {
  title: string;
  cells: Cell[];
}

export interface INotebookRepository {
  /** Newest edit first, without cells. */
  list(): Promise<NotebookSummary[]>;
  findById(id: string): Promise<Result<Notebook>>;
  create(data: NewNotebook): Promise<Result<Notebook>>;
  update(id: string, patch: NotebookPatch): Promise<Result<Notebook>>;
  delete(id: string): Promise<Result<void>>;
}
```

`src/domain/notebook/kernel-protocol.ts`:

```ts
import type { CellOutput } from "./notebook";

/** UI → kernel worker. One run at a time; runId ties outputs back to the cell. */
export type KernelRequest = { type: "run"; runId: number; source: string };

/** Kernel worker → UI. Output may still arrive after "done" (an un-awaited promise). */
export type KernelEvent =
  | { type: "output"; runId: number; output: CellOutput }
  | { type: "done"; runId: number; ok: boolean };
```

`src/domain/notebook/templates.ts` (Task 6 adds `TEMPLATES` below these lines):

```ts
/** Starter notebooks: one per LangGraph lesson (same ids as the playgrounds), plus the week's topics. */
export const TEMPLATE_IDS = [
  "lg-greet",
  "lg-chain",
  "lg-route",
  "lg-parallel",
  "lg-orchestrate",
  "lg-evaluate",
  "tools",
  "memory",
  "hitl",
  "subgraphs",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const isTemplateId = (id: string): id is TemplateId =>
  (TEMPLATE_IDS as readonly string[]).includes(id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/domain/notebook/notebook.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/notebook
git commit -m "feat(notebook): add notebook domain model and kernel protocol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Table, Supabase repository and in-memory fake

**Files:**

- Create: `supabase/migrations/20261104090000_notebooks.sql`
- Modify: `src/infrastructure/supabase/database.types.ts` (regenerated)
- Modify: `src/infrastructure/repositories/mappers.ts` (append)
- Create: `src/infrastructure/repositories/supabase-notebook-repository.ts`
- Modify: `test/fakes/in-memory-store.ts` (append a class)
- Test: `test/contracts/notebook-repository.test.ts`

**Interfaces:**

- Consumes: `INotebookRepository`, `NewNotebook`, `NotebookPatch`, `Notebook`, `NotebookSummary`, `cellsSchema`, `TEMPLATE_IDS` (Task 1).
- Produces: `SupabaseNotebookRepository(db: Db)`, `InMemoryNotebookRepository()`, `toNotebook(r: Tables<"notebooks">): Notebook`, `toNotebookSummary(r): NotebookSummary`, `NOTEBOOK_SUMMARY_SELECT`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20261104090000_notebooks.sql`:

```sql
-- Practice notebooks: the admin's Jupyter-style LangGraph cells, saved with their last outputs.
-- Docs: docs/features/F14-practice-notebook.md

create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  -- The starter it was made from (src/domain/notebook/templates.ts), or null for a blank one.
  template text,
  -- Cell[]: { id, kind: code|markdown, source, output? }. Shape and limits are checked by Zod.
  cells jsonb not null default '[]'::jsonb check (jsonb_typeof(cells) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notebooks_updated_at_idx on public.notebooks (updated_at desc);

create trigger notebooks_updated_at before update on public.notebooks
  for each row execute function public.set_updated_at();

alter table public.notebooks enable row level security;
create policy "notebooks: admin all" on public.notebooks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

- [ ] **Step 2: Apply it and regenerate types**

Run:

```bash
supabase start
supabase migration up
supabase gen types typescript --local > src/infrastructure/supabase/database.types.ts
```

Expected: `database.types.ts` now contains `notebooks: { Row: { cells: Json; created_at: string; id: string; template: string | null; title: string; updated_at: string } ... }`.

- [ ] **Step 3: Write the failing contract test**

`test/contracts/notebook-repository.test.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseNotebookRepository } from "@/infrastructure/repositories/supabase-notebook-repository";
import type { Database } from "@/infrastructure/supabase/database.types";

/**
 * Notebooks through RLS, signed in as a real (throwaway) admin and a non-admin.
 * Needs `supabase start`; run with `pnpm test:db`.
 */
describe.runIf(process.env.SUPABASE_TEST === "1")(
  "notebook repository against local Supabase",
  () => {
    const url = () => process.env.SUPABASE_URL!;
    // Secret key: setup and cleanup only (bypasses RLS).
    const secret = () =>
      createClient<Database>(url(), process.env.SUPABASE_SECRET_KEY!, {
        auth: { persistSession: false },
      });
    const signedIn = async (email: string) => {
      const db = createClient<Database>(url(), process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: { persistSession: false },
      });
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return db;
    };

    const password = `test-${crypto.randomUUID()}`;
    const adminEmail = `nb-test-admin-${crypto.randomUUID().slice(0, 8)}@local.test`;
    const userEmail = `nb-test-user-${crypto.randomUUID().slice(0, 8)}@local.test`;
    const userIds: string[] = [];
    const notebookIds: string[] = [];

    beforeAll(async () => {
      for (const [email, app_metadata] of [
        [adminEmail, { role: "admin" }],
        [userEmail, {}],
      ] as const) {
        const { data, error } = await secret().auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata,
        });
        if (error) throw error;
        userIds.push(data.user.id);
      }
    });

    // Leave the database as we found it.
    afterAll(async () => {
      if (notebookIds.length) await secret().from("notebooks").delete().in("id", notebookIds);
      for (const id of userIds) await secret().auth.admin.deleteUser(id);
    });

    it("creates, reads, saves with outputs, lists and deletes as the admin", async () => {
      const repo = new SupabaseNotebookRepository(await signedIn(adminEmail));
      const created = await repo.create({
        title: "Practice",
        template: "lg-greet",
        cells: [{ id: "c1", kind: "code", source: "1 + 1" }],
      });
      if (!created.ok) throw created.error;
      notebookIds.push(created.value.id);
      expect(created.value.template).toBe("lg-greet");

      const saved = await repo.update(created.value.id, {
        title: "Practice 2",
        cells: [{ id: "c1", kind: "code", source: "1 + 1", output: [{ type: "log", text: "2" }] }],
      });
      expect(saved.ok && saved.value.cells[0]?.output).toEqual([{ type: "log", text: "2" }]);

      const listed = await repo.list();
      expect(listed.find((n) => n.id === created.value.id)?.title).toBe("Practice 2");

      expect((await repo.delete(created.value.id)).ok).toBe(true);
      expect((await repo.findById(created.value.id)).ok).toBe(false);
    });

    it("hides notebooks from a signed-in non-admin and refuses their writes (RLS)", async () => {
      const admin = new SupabaseNotebookRepository(await signedIn(adminEmail));
      const mine = await admin.create({ title: "Private", template: null, cells: [] });
      if (!mine.ok) throw mine.error;
      notebookIds.push(mine.value.id);

      const other = new SupabaseNotebookRepository(await signedIn(userEmail));
      expect(await other.list()).toEqual([]);
      expect((await other.findById(mine.value.id)).ok).toBe(false);
      await expect(other.create({ title: "Nope", template: null, cells: [] })).rejects.toThrow();
    });
  },
);
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm test:db`
Expected: FAIL with "Failed to resolve import "@/infrastructure/repositories/supabase-notebook-repository"".

- [ ] **Step 5: Add the mappers**

Append to `src/infrastructure/repositories/mappers.ts` (add the imports at the top of the file):

```ts
import { cellsSchema, type Notebook, type NotebookSummary } from "@/domain/notebook/notebook";
import { isTemplateId } from "@/domain/notebook/templates";
```

```ts
export const NOTEBOOK_SUMMARY_SELECT = "id, title, template, created_at, updated_at" as const;
type NotebookSummaryRow = Pick<
  Tables<"notebooks">,
  "id" | "title" | "template" | "created_at" | "updated_at"
>;

export const toNotebookSummary = (r: NotebookSummaryRow): NotebookSummary => ({
  id: r.id,
  title: r.title,
  template: r.template && isTemplateId(r.template) ? r.template : null,
  createdAt: new Date(r.created_at),
  updatedAt: new Date(r.updated_at),
});

/** Cells are JSONB: re-validated on read, so a bad row fails loudly instead of breaking the editor. */
export function toNotebook(r: Tables<"notebooks">): Notebook {
  const cells = cellsSchema.safeParse(r.cells);
  if (!cells.success) throw new Error(`Notebook ${r.id} has invalid cells`);
  return { ...toNotebookSummary(r), cells: cells.data };
}
```

- [ ] **Step 6: Write the repository**

`src/infrastructure/repositories/supabase-notebook-repository.ts`:

```ts
import type { Notebook, NotebookSummary } from "@/domain/notebook/notebook";
import type {
  INotebookRepository,
  NewNotebook,
  NotebookPatch,
} from "@/domain/notebook/notebook-repository";
import { NotFoundError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import type { Json } from "../supabase/database.types";
import type { Db } from "../supabase/server-client";
import { rowsOrThrow, throwOnError, toDomainError } from "./db-errors";
import { NOTEBOOK_SUMMARY_SELECT, toNotebook, toNotebookSummary } from "./mappers";

export class SupabaseNotebookRepository implements INotebookRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<NotebookSummary[]> {
    const rows = rowsOrThrow(
      await this.db
        .from("notebooks")
        .select(NOTEBOOK_SUMMARY_SELECT)
        .order("updated_at", { ascending: false }),
      "List notebooks",
    );
    return rows.map(toNotebookSummary);
  }

  async findById(id: string): Promise<Result<Notebook>> {
    const row = throwOnError(
      await this.db.from("notebooks").select("*").eq("id", id).maybeSingle(),
      "Find notebook",
    );
    return row ? ok(toNotebook(row)) : err(new NotFoundError("Notebook", id));
  }

  async create(data: NewNotebook): Promise<Result<Notebook>> {
    const { data: row, error } = await this.db
      .from("notebooks")
      .insert({ title: data.title, template: data.template, cells: data.cells as Json })
      .select("*")
      .single();
    return error ? err(toDomainError(error, "notebook", "write")) : ok(toNotebook(row));
  }

  async update(id: string, patch: NotebookPatch): Promise<Result<Notebook>> {
    const { data, error } = await this.db
      .from("notebooks")
      .update({ title: patch.title, cells: patch.cells as Json })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) return err(toDomainError(error, "notebook", "write"));
    return data ? ok(toNotebook(data)) : err(new NotFoundError("Notebook", id));
  }

  async delete(id: string): Promise<Result<void>> {
    const { data, error } = await this.db.from("notebooks").delete().eq("id", id).select("id");
    if (error) return err(toDomainError(error, "notebook", "delete"));
    return data.length ? ok(undefined) : err(new NotFoundError("Notebook", id));
  }
}
```

Note: a non-admin insert fails RLS with Postgres code `42501`, which `toDomainError` does not map, so it throws. The contract test expects that throw.

- [ ] **Step 7: Add the in-memory fake**

Append to `test/fakes/in-memory-store.ts` (add imports at the top):

```ts
import type { Notebook, NotebookSummary } from "@/domain/notebook/notebook";
import type {
  INotebookRepository,
  NewNotebook,
  NotebookPatch,
} from "@/domain/notebook/notebook-repository";
```

```ts
export class InMemoryNotebookRepository implements INotebookRepository {
  private rows = new Map<string, Notebook>();
  private tick = 0;
  // Strictly increasing, so "newest edit first" is stable in tests.
  private now = () => new Date(Date.UTC(2026, 10, 4) + ++this.tick * 1000);

  async list(): Promise<NotebookSummary[]> {
    return [...this.rows.values()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(({ cells: _cells, ...summary }) => summary);
  }

  async findById(id: string): Promise<Result<Notebook>> {
    const row = this.rows.get(id);
    return row ? ok(structuredClone(row)) : err(new NotFoundError("Notebook", id));
  }

  async create(data: NewNotebook): Promise<Result<Notebook>> {
    const at = this.now();
    const row: Notebook = {
      id: crypto.randomUUID(),
      ...structuredClone(data),
      createdAt: at,
      updatedAt: at,
    };
    this.rows.set(row.id, row);
    return ok(structuredClone(row));
  }

  async update(id: string, patch: NotebookPatch): Promise<Result<Notebook>> {
    const row = this.rows.get(id);
    if (!row) return err(new NotFoundError("Notebook", id));
    const next = { ...row, ...structuredClone(patch), updatedAt: this.now() };
    this.rows.set(id, next);
    return ok(structuredClone(next));
  }

  async delete(id: string): Promise<Result<void>> {
    return this.rows.delete(id) ? ok(undefined) : err(new NotFoundError("Notebook", id));
  }
}
```

If ESLint flags `_cells` as unused, use `.map((n) => ({ id: n.id, title: n.title, template: n.template, createdAt: n.createdAt, updatedAt: n.updatedAt }))` instead.

- [ ] **Step 8: Run the checks**

Run: `pnpm test:db && pnpm typecheck`
Expected: PASS, including "notebook repository against local Supabase" (2 tests).

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20261104090000_notebooks.sql src/infrastructure/supabase/database.types.ts src/infrastructure/repositories test/fakes/in-memory-store.ts test/contracts/notebook-repository.test.ts
git commit -m "feat(notebook): add notebooks table, Supabase repository and fake

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Notebook service, actions and wiring

**Files:**

- Create: `src/application/notebook-service.ts`
- Test: `src/application/notebook-service.test.ts`
- Modify: `test/fakes/setup.ts` (one import, one line)
- Modify: `src/lib/container.ts` (imports + `admin.notebooks`)
- Create: `src/app/actions/notebooks.ts`

**Interfaces:**

- Consumes: Task 1 and 2 types; `TEMPLATES` from `src/domain/notebook/templates.ts` (Task 6 fills it; this task adds an empty-safe placeholder export so it compiles — see Step 3).
- Produces: `NotebookService` with `list(): Promise<NotebookSummary[]>`, `get(id): Promise<Result<Notebook>>`, `create(template: TemplateId | null): Promise<Result<Notebook>>`, `save(id, input: NotebookSaveInput): Promise<Result<Notebook>>`, `remove(id): Promise<Result<void>>`; `notebookSaveSchema`, `NotebookSaveInput`, `newNotebookSchema`.
- Produces actions: `createNotebook(formData: FormData): Promise<void>`, `saveNotebook(notebookId: string, raw: unknown): Promise<SaveNotebookResult>`, `deleteNotebook(notebookId: string): Promise<ActionState>`, `type SaveNotebookResult = { ok: true } | { ok: false; code: string; message: string }`.

- [ ] **Step 1: Write the failing test**

`src/application/notebook-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/domain/notebook/templates";
import { setup } from "../../test/fakes/setup";
import { newNotebookSchema, notebookSaveSchema } from "./notebook-service";

describe("NotebookService", () => {
  it("creates a blank notebook with one empty code cell", async () => {
    const { notebooks } = setup();
    const r = await notebooks.create(null);
    if (!r.ok) throw r.error;
    expect(r.value.title).toBe("Untitled notebook");
    expect(r.value.template).toBeNull();
    expect(r.value.cells).toEqual([{ id: expect.any(String), kind: "code", source: "" }]);
  });

  it("creates from a template with its title, its cells and fresh cell ids", async () => {
    const { notebooks } = setup();
    const a = await notebooks.create("lg-greet");
    const b = await notebooks.create("lg-greet");
    if (!a.ok || !b.ok) throw new Error("create failed");
    expect(a.value.title).toBe(TEMPLATES["lg-greet"].title);
    expect(a.value.cells.map((c) => c.source)).toEqual(
      TEMPLATES["lg-greet"].cells.map((c) => c.source),
    );
    expect(a.value.cells[0]?.id).not.toBe(b.value.cells[0]?.id);
  });

  it("saves title and cells with outputs, and lists newest first", async () => {
    const { notebooks } = setup();
    const first = await notebooks.create(null);
    const second = await notebooks.create(null);
    if (!first.ok || !second.ok) throw new Error("create failed");
    const saved = await notebooks.save(first.value.id, {
      title: "Revised",
      cells: [{ id: "c1", kind: "code", source: "1", output: [{ type: "log", text: "1" }] }],
    });
    expect(saved.ok && saved.value.title).toBe("Revised");
    expect((await notebooks.list()).map((n) => n.title)).toEqual(["Revised", "Untitled notebook"]);
  });

  it("removes a notebook and reports a missing one", async () => {
    const { notebooks } = setup();
    const r = await notebooks.create(null);
    if (!r.ok) throw r.error;
    expect((await notebooks.remove(r.value.id)).ok).toBe(true);
    const gone = await notebooks.get(r.value.id);
    expect(!gone.ok && gone.error.code).toBe("NOT_FOUND");
  });
});

describe("notebook schemas", () => {
  it("trims the title and rejects a blank one", () => {
    expect(notebookSaveSchema.safeParse({ title: "  Hi ", cells: [] }).data?.title).toBe("Hi");
    expect(notebookSaveSchema.safeParse({ title: "   ", cells: [] }).success).toBe(false);
  });

  it("accepts a known template or null, nothing else", () => {
    expect(newNotebookSchema.safeParse({ template: "tools" }).success).toBe(true);
    expect(newNotebookSchema.safeParse({ template: null }).success).toBe(true);
    expect(newNotebookSchema.safeParse({ template: "rm -rf" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/application/notebook-service.test.ts`
Expected: FAIL with "Failed to resolve import "./notebook-service"".

- [ ] **Step 3: Make `TEMPLATES` exist (filled in Task 6)**

Append to `src/domain/notebook/templates.ts` so this task compiles. Task 6 replaces the `TEMPLATES` body with the real content and keeps these types:

```ts
import type { Cell } from "./notebook";

export type TemplateCell = Pick<Cell, "kind" | "source">;
export interface Template {
  title: string;
  cells: TemplateCell[];
}

export const TEMPLATES: Record<TemplateId, Template> = Object.fromEntries(
  TEMPLATE_IDS.map((id) => [id, { title: id, cells: [{ kind: "code", source: "// " + id }] }]),
) as Record<TemplateId, Template>;
```

(Place the `import type` line at the top of the file.)

- [ ] **Step 4: Write the service**

`src/application/notebook-service.ts`:

```ts
import { z } from "zod";
import {
  cellsSchema,
  type Cell,
  type Notebook,
  type NotebookSummary,
} from "@/domain/notebook/notebook";
import type { INotebookRepository } from "@/domain/notebook/notebook-repository";
import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from "@/domain/notebook/templates";
import type { Result } from "@/domain/shared/result";

export const notebookSaveSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the notebook a title")
    .max(120, "Keep the title under 120 characters"),
  cells: cellsSchema,
});
export type NotebookSaveInput = z.output<typeof notebookSaveSchema>;

export const newNotebookSchema = z.object({ template: z.enum(TEMPLATE_IDS).nullable() });

const freshCell = (cell: Pick<Cell, "kind" | "source">): Cell => ({
  id: crypto.randomUUID(),
  ...cell,
});

/** The admin's practice notebooks. Readers never reach this. */
export class NotebookService {
  constructor(private readonly repo: INotebookRepository) {}

  list(): Promise<NotebookSummary[]> {
    return this.repo.list();
  }

  get(id: string): Promise<Result<Notebook>> {
    return this.repo.findById(id);
  }

  /** Blank: one empty code cell. From a template: its cells, with new ids each time. */
  create(template: TemplateId | null): Promise<Result<Notebook>> {
    const t = template ? TEMPLATES[template] : null;
    return this.repo.create({
      title: t?.title ?? "Untitled notebook",
      template,
      cells: t ? t.cells.map(freshCell) : [freshCell({ kind: "code", source: "" })],
    });
  }

  save(id: string, input: NotebookSaveInput): Promise<Result<Notebook>> {
    return this.repo.update(id, input);
  }

  remove(id: string): Promise<Result<void>> {
    return this.repo.delete(id);
  }
}
```

- [ ] **Step 5: Wire the fake and the container**

`test/fakes/setup.ts`: add `NotebookService` to the imports (`import { NotebookService } from "@/application/notebook-service";`), add `InMemoryNotebookRepository` to the `./in-memory-store` import list, and add this line right after `focus: new FocusService(new InMemoryFocusRepository(), clock),`:

```ts
    notebooks: new NotebookService(new InMemoryNotebookRepository()),
```

`src/lib/container.ts`: add the imports

```ts
import { NotebookService } from "@/application/notebook-service";
import { SupabaseNotebookRepository } from "@/infrastructure/repositories/supabase-notebook-repository";
```

and, inside `admin`, right after `focus: ...`:

```ts
    notebooks: async () =>
      new NotebookService(new SupabaseNotebookRepository(await createSupabaseServerClient())),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/application/notebook-service.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Write the server actions**

`src/app/actions/notebooks.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { newNotebookSchema, notebookSaveSchema } from "@/application/notebook-service";
import { fromDomainError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";

const id = z.uuid();

/** Form action: "New notebook" (blank or from a template) and the lessons' "Practise this". */
export async function createNotebook(formData: FormData): Promise<void> {
  const input = newNotebookSchema.safeParse({ template: formData.get("template") || null });
  if (!input.success) throw new Error("Unknown notebook template");
  const auth = await authorize();
  if (!auth.ok) redirect("/login");

  const created = await (await container.admin.notebooks()).create(input.data.template);
  if (!created.ok) throw new Error(created.error.message);
  redirect(`/admin/notebooks/${created.value.id}`);
}

export type SaveNotebookResult = { ok: true } | { ok: false; code: string; message: string };

/** Autosave from the editor (about 1s after the last change). */
export async function saveNotebook(notebookId: string, raw: unknown): Promise<SaveNotebookResult> {
  const input = notebookSaveSchema.safeParse(raw);
  if (!input.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: input.error.issues[0]?.message ?? "Invalid notebook",
    };
  }
  if (!id.safeParse(notebookId).success)
    return { ok: false, code: "VALIDATION", message: "Invalid notebook" };
  const auth = await authorize();
  if (!auth.ok) return { ok: false, code: auth.error.code, message: auth.error.message };

  const saved = await (await container.admin.notebooks()).save(notebookId, input.data);
  return saved.ok
    ? { ok: true }
    : { ok: false, code: saved.error.code, message: saved.error.message };
}

export async function deleteNotebook(notebookId: string): Promise<ActionState> {
  if (!id.safeParse(notebookId).success) return { error: "Invalid notebook" };
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const deleted = await (await container.admin.notebooks()).remove(notebookId);
  if (!deleted.ok) return fromDomainError(deleted.error);
  redirect("/admin/notebooks");
}
```

Note: Next's default server-action body limit is 1 MB. A notebook whose saved outputs pass that fails to save and shows "Unsaved" (Task 8). Mark it in the code with `// ponytail: 1 MB server-action body limit; raise serverActions.bodySizeLimit if real notebooks hit it` above `saveNotebook`.

- [ ] **Step 8: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/application/notebook-service.ts src/application/notebook-service.test.ts src/domain/notebook/templates.ts test/fakes/setup.ts src/lib/container.ts src/app/actions/notebooks.ts
git commit -m "feat(notebook): add notebook service and server actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin-only model proxy

**Files:**

- Create: `src/domain/notebook/chat-proxy.ts`
- Create: `src/application/notebook-model-service.ts`
- Test: `src/application/notebook-model-service.test.ts`
- Create: `src/infrastructure/ai/openai-proxy.ts`
- Test: `src/infrastructure/ai/openai-proxy.test.ts`
- Create: `src/app/api/learn/openai/v1/chat/completions/route.ts`
- Modify: `src/lib/container.ts`

**Interfaces:**

- Produces: `NOTEBOOK_MODEL = "gpt-4o-mini"`, `NOTEBOOK_MAX_TOKENS = 1000`, `interface IChatProxy { forward(body: Record<string, unknown>): Promise<Result<Response, GenerationError>> }`.
- Produces: `chatRequestSchema`, `NotebookModelService(proxy).chat(raw: unknown): Promise<Result<Response>>`.
- Produces: `OpenAIProxy(apiKey: string | undefined, send?: typeof fetch)`.
- Produces: `POST /api/learn/openai/v1/chat/completions` → 401 (not admin), 400 (bad body or other model), 503 (no key or provider failure), otherwise OpenAI's response streamed back unchanged.

- [ ] **Step 1: Read the route handler docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (Request/Response, `POST(request)`). Note that `src/proxy.ts` only matches `/admin/:path*`, so this route checks `authorize()` itself, and the session cookie is not refreshed on `/api` calls (an expired session returns 401; opening any `/admin` page refreshes it).

- [ ] **Step 2: Write the failing service test**

`src/application/notebook-model-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { IChatProxy } from "@/domain/notebook/chat-proxy";
import { ok } from "@/domain/shared/result";
import { NotebookModelService } from "./notebook-model-service";

function make() {
  const sent: Record<string, unknown>[] = [];
  const proxy: IChatProxy = {
    forward: async (body) => {
      sent.push(body);
      return ok(new Response("{}"));
    },
  };
  return { sent, service: new NotebookModelService(proxy) };
}

const msg = [{ role: "user", content: "hi" }];

describe("NotebookModelService", () => {
  it("injects max_tokens 1000 when missing and keeps tool fields", async () => {
    const { sent, service } = make();
    const tools = [{ type: "function", function: { name: "calc", parameters: {} } }];
    const r = await service.chat({ model: "gpt-4o-mini", messages: msg, tools, stream: true });
    expect(r.ok).toBe(true);
    expect(sent[0]).toEqual({
      model: "gpt-4o-mini",
      messages: msg,
      tools,
      stream: true,
      max_tokens: 1000,
    });
  });

  it("caps max_tokens and max_completion_tokens at 1000", async () => {
    const { sent, service } = make();
    await service.chat({ model: "gpt-4o-mini", messages: msg, max_tokens: 5000 });
    await service.chat({ model: "gpt-4o-mini", messages: msg, max_completion_tokens: 4000 });
    expect(sent[0]?.max_tokens).toBe(1000);
    expect(sent[1]).toMatchObject({ max_completion_tokens: 1000 });
    expect(sent[1]).not.toHaveProperty("max_tokens");
  });

  it("passes tool messages and assistant tool calls with null content", async () => {
    const { sent, service } = make();
    const messages = [
      { role: "user", content: "50 AAPL?" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "t1", type: "function", function: { name: "price", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "t1", content: "227.5" },
    ];
    expect((await service.chat({ model: "gpt-4o-mini", messages })).ok).toBe(true);
    expect(sent[0]?.messages).toEqual(messages);
  });

  it("rejects another model, n > 1 and an empty message list without calling OpenAI", async () => {
    const { sent, service } = make();
    const other = await service.chat({ model: "gpt-4o", messages: msg });
    expect(!other.ok && other.error.message).toBe("Only gpt-4o-mini is allowed in the notebook");
    expect((await service.chat({ model: "gpt-4o-mini", messages: msg, n: 3 })).ok).toBe(false);
    expect((await service.chat({ model: "gpt-4o-mini", messages: [] })).ok).toBe(false);
    expect(sent).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/application/notebook-model-service.test.ts`
Expected: FAIL with "Failed to resolve import "@/domain/notebook/chat-proxy"".

- [ ] **Step 4: Write the domain port and the service**

`src/domain/notebook/chat-proxy.ts`:

```ts
import type { GenerationError } from "../shared/errors";
import type { Result } from "../shared/result";

/** The one model notebook code may call, and its per-call token cap. */
export const NOTEBOOK_MODEL = "gpt-4o-mini";
export const NOTEBOOK_MAX_TOKENS = 1000;

export interface IChatProxy {
  /** Sends one chat-completions body with the server's key; returns the provider's response as is (streamed). */
  forward(body: Record<string, unknown>): Promise<Result<Response, GenerationError>>;
}
```

`src/application/notebook-model-service.ts`:

```ts
import { z } from "zod";
import { NOTEBOOK_MAX_TOKENS, NOTEBOOK_MODEL, type IChatProxy } from "@/domain/notebook/chat-proxy";
import { ValidationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";

const cap = z
  .number()
  .int()
  .positive()
  .transform((n) => Math.min(n, NOTEBOOK_MAX_TOKENS));

/**
 * What notebook code may send to OpenAI: one model, capped tokens, one answer per call.
 * Everything else (tools, tool_choice, streaming, response_format, temperature) passes through.
 */
export const chatRequestSchema = z
  .looseObject({
    model: z.literal(NOTEBOOK_MODEL, { error: "Only gpt-4o-mini is allowed in the notebook" }),
    messages: z
      .array(z.looseObject({ role: z.enum(["system", "developer", "user", "assistant", "tool"]) }))
      .min(1)
      .max(500),
    max_tokens: cap.optional(),
    max_completion_tokens: cap.optional(),
    n: z.literal(1).optional(),
  })
  .transform((body) =>
    body.max_completion_tokens === undefined
      ? { ...body, max_tokens: body.max_tokens ?? NOTEBOOK_MAX_TOKENS }
      : body,
  );

/** Model calls from the admin's notebook. The route checks the admin; this checks the request. */
export class NotebookModelService {
  constructor(private readonly proxy: IChatProxy) {}

  async chat(raw: unknown): Promise<Result<Response>> {
    const body = chatRequestSchema.safeParse(raw);
    if (!body.success) {
      return err(new ValidationError(body.error.issues[0]?.message ?? "Invalid request"));
    }
    return this.proxy.forward(body.data);
  }
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run src/application/notebook-model-service.test.ts`
Expected: PASS (4 tests). If the first test fails because `z.literal(...)`'s custom message isn't the first issue, keep the assertion and move the message check to `issues.find((i) => i.path[0] === "model")`.

- [ ] **Step 6: Write the failing proxy test**

`src/infrastructure/ai/openai-proxy.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { OpenAIProxy } from "./openai-proxy";

const body = {
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "hi" }],
  max_tokens: 1000,
};

describe("OpenAIProxy", () => {
  it("says the demo is off without a key, and calls nothing", async () => {
    const send = vi.fn<typeof fetch>();
    const r = await new OpenAIProxy(undefined, send).forward(body);
    expect(!r.ok && r.error.message).toBe("This demo isn't switched on yet.");
    expect(send).not.toHaveBeenCalled();
  });

  it("forwards with the server key and returns OpenAI's status, type and body unchanged", async () => {
    const send = vi.fn<typeof fetch>(
      async () =>
        new Response("data: {}\n\n", {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const r = await new OpenAIProxy("sk-test", send).forward(body);
    if (!r.ok) throw r.error;
    const [url, init] = send.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk-test");
    expect(JSON.parse(String(init?.body))).toEqual(body);
    expect(r.value.headers.get("content-type")).toBe("text/event-stream");
    expect(await r.value.text()).toBe("data: {}\n\n");
  });

  it("passes OpenAI's own errors through so the SDK can show them", async () => {
    const send = vi.fn<typeof fetch>(async () =>
      Response.json({ error: { message: "bad" } }, { status: 400 }),
    );
    const r = await new OpenAIProxy("sk-test", send).forward(body);
    expect(r.ok && r.value.status).toBe(400);
  });

  it("maps a network failure to a generation error without leaking it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn<typeof fetch>(async () => {
      throw new Error("ECONNRESET secret detail");
    });
    const r = await new OpenAIProxy("sk-test", send).forward(body);
    expect(!r.ok && r.error.code).toBe("GENERATION");
    expect(!r.ok && r.error.message).not.toContain("secret");
  });
});
```

- [ ] **Step 7: Write the proxy**

`src/infrastructure/ai/openai-proxy.ts`:

```ts
import { NOTEBOOK_MODEL, type IChatProxy } from "@/domain/notebook/chat-proxy";
import { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import { toPublicGenerationError } from "./error-mapping";

const COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/** The notebook's only way to OpenAI: adds the server key, streams the answer back untouched. */
export class OpenAIProxy implements IChatProxy {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly send: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async forward(body: Record<string, unknown>): Promise<Result<Response, GenerationError>> {
    if (!this.apiKey)
      return err(new GenerationError("provider", "This demo isn't switched on yet."));
    try {
      const upstream = await this.send(COMPLETIONS_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      // As is: streaming keeps working and OpenAI's error JSON reaches the SDK in the notebook.
      return ok(
        new Response(upstream.body, {
          status: upstream.status,
          headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
        }),
      );
    } catch (error) {
      return err(toPublicGenerationError(error, "notebook proxy", { model: NOTEBOOK_MODEL }));
    }
  }
}
```

- [ ] **Step 8: Wire it and write the route**

`src/lib/container.ts`: add imports

```ts
import { NotebookModelService } from "@/application/notebook-model-service";
import { OpenAIProxy } from "@/infrastructure/ai/openai-proxy";
```

and inside `admin`, after `notebooks`:

```ts
    /** The caller must have passed authorize() first (the route does). */
    notebookModel: () => new NotebookModelService(new OpenAIProxy(getEnv().OPENAI_API_KEY)),
```

`src/app/api/learn/openai/v1/chat/completions/route.ts`:

```ts
import { authorize } from "@/app/_lib/auth";
import { ValidationError } from "@/domain/shared/errors";
import { container } from "@/lib/container";

// OpenAI-shaped errors ({ error: { message } }) so the SDK in the notebook shows the message.
const fail = (message: string, status: number) => Response.json({ error: { message } }, { status });

/** The notebook kernel's ChatOpenAI points here. Admin only; the key stays on the server. */
export async function POST(request: Request) {
  const auth = await authorize();
  if (!auth.ok) return fail(auth.error.message, 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("The request body must be JSON", 400);
  }

  const res = await container.admin.notebookModel().chat(raw);
  if (res.ok) return res.value;
  return fail(res.error.message, res.error instanceof ValidationError ? 400 : 503);
}
```

- [ ] **Step 9: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

Then, with `pnpm dev` running and signed out in a private window:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/learn/openai/v1/chat/completions -H 'content-type: application/json' -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

Expected: `401`.

- [ ] **Step 10: Commit**

```bash
git add src/domain/notebook/chat-proxy.ts src/application/notebook-model-service.ts src/application/notebook-model-service.test.ts src/infrastructure/ai/openai-proxy.ts src/infrastructure/ai/openai-proxy.test.ts src/app/api src/lib/container.ts
git commit -m "feat(notebook): add admin-only OpenAI proxy for notebook model calls

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cell transform and kernel worker

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml` (add `sucrase`, `acorn`)
- Create: `src/infrastructure/notebook-runtime/transform-cell.ts`
- Test: `src/infrastructure/notebook-runtime/transform-cell.test.ts`
- Create: `src/infrastructure/notebook-runtime/kernel.worker.ts`

**Interfaces:**

- Consumes: `KernelRequest`, `KernelEvent`, `CellOutput` (Task 1); `NOTEBOOK_MODEL`, `NOTEBOOK_MAX_TOKENS` (Task 4).
- Produces: `transformCell(source: string): CellProgram` where `CellProgram = { ok: true; body: string; names: string[] } | { ok: false; error: string }`. `body` is meant for `new AsyncFunction("__require", body)(require)`; it returns the value of a final expression statement.
- Produces: the worker at `src/infrastructure/notebook-runtime/kernel.worker.ts`, started by the UI with `new Worker(new URL("../../infrastructure/notebook-runtime/kernel.worker.ts", import.meta.url), { type: "module" })`. Globals inside it: `model`, `show(graph, opts?: { xray?: boolean })`.

- [ ] **Step 1: Add the dependencies**

Run: `pnpm add sucrase@3.35.1 acorn@8.19.0`
Expected: both in `dependencies`.

- [ ] **Step 2: Write the failing test**

`src/infrastructure/notebook-runtime/transform-cell.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { transformCell } from "./transform-cell";

type Run = (require: (name: string) => unknown) => Promise<unknown>;
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => Run;

const shared = globalThis as Record<string, unknown>;
const declared: string[] = [];

async function run(source: string, modules: Record<string, unknown> = {}) {
  const cell = transformCell(source);
  if (!cell.ok) throw new Error(cell.error);
  declared.push(...cell.names);
  const required: string[] = [];
  const result = await new AsyncFunction("__require", cell.body)((name) => {
    required.push(name);
    return modules[name];
  });
  return { result, names: cell.names, required };
}

afterEach(() => {
  for (const name of declared.splice(0)) delete shared[name];
});

describe("transformCell", () => {
  it("strips types and returns the last expression", async () => {
    const { result, names } = await run("const n: number = 2;\ninterface X { a: string }\nn * 3");
    expect(result).toBe(6);
    expect(names).toEqual(["n"]);
  });

  it("turns imports into lookups on the allowed modules", async () => {
    const { result, names, required } = await run(
      'import { a, b as c } from "x";\nimport * as ns from "y";\nimport d from "z";\na + c + ns.k + d',
      { x: { a: 1, b: 2 }, y: { k: 3 }, z: { default: 4 } },
    );
    expect(result).toBe(10);
    expect(names).toEqual(["a", "c", "ns", "d"]);
    expect(required).toEqual(["x", "x", "y", "z"]);
  });

  it("drops type-only imports", async () => {
    const { required } = await run('import type { T } from "x";\nconst v: T = 1;');
    expect(required).toEqual([]);
  });

  it("shares top-level names with later cells, destructuring included", async () => {
    await run(
      "const { p, q: [r], ...rest } = { p: 1, q: [2], s: 3 };\nfunction f() { return p + r; }\nclass K {}\nlet m = 1;",
    );
    expect(shared.p).toBe(1);
    expect(shared.r).toBe(2);
    expect(shared.rest).toEqual({ s: 3 });
    const { result } = await run("f() + m + (new K() instanceof K ? 10 : 0)");
    expect(result).toBe(14);
  });

  it("supports top-level await", async () => {
    const { result } = await run("const v = await Promise.resolve(5);\nv + 1");
    expect(result).toBe(6);
  });

  it("returns undefined when the cell ends with a declaration", async () => {
    const { result } = await run("const z1 = 1;");
    expect(result).toBeUndefined();
  });

  it("rejects export with a clear message", () => {
    const cell = transformCell("export const a = 1;");
    expect(!cell.ok && cell.error).toContain("`export` isn't needed");
  });

  it("reports a syntax error with its position", () => {
    const cell = transformCell("const = 1;");
    expect(!cell.ok && cell.error).toMatch(/^Syntax error: .*\(1:\d+\)/);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/infrastructure/notebook-runtime/transform-cell.test.ts`
Expected: FAIL with "Failed to resolve import "./transform-cell"".

- [ ] **Step 4: Write the transform**

`src/infrastructure/notebook-runtime/transform-cell.ts`:

```ts
import { parse, type Pattern, type Program } from "acorn";
import { transform } from "sucrase";

export type CellProgram =
  { ok: true; body: string; names: string[] } | { ok: false; error: string };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function patternNames(p: Pattern): string[] {
  switch (p.type) {
    case "Identifier":
      return [p.name];
    case "ObjectPattern":
      return p.properties.flatMap((prop) =>
        prop.type === "RestElement" ? patternNames(prop.argument) : patternNames(prop.value),
      );
    case "ArrayPattern":
      return p.elements.flatMap((e) => (e ? patternNames(e) : []));
    case "AssignmentPattern":
      return patternNames(p.left);
    case "RestElement":
      return patternNames(p.argument);
    default:
      return []; // a member expression declares nothing
  }
}

/**
 * One notebook cell → the body of an async function `(__require) => …`, Jupyter-style:
 * types stripped (sucrase), imports become `__require(...)` lookups, top-level names are copied
 * onto globalThis at the end so later cells see them, and a final expression is returned.
 * ponytail: names are shared only when the cell finishes; a cell that throws halfway shares
 * nothing, and labels/`export` don't carry across. A real REPL scope if that ever bites.
 */
export function transformCell(source: string): CellProgram {
  let js: string;
  let program: Program;
  try {
    // keepUnusedImports: the next cell may use a name this cell imports.
    js = transform(source, {
      transforms: ["typescript"],
      keepUnusedImports: true,
      disableESTransforms: true,
    }).code;
    program = parse(js, { ecmaVersion: "latest", sourceType: "module" });
  } catch (error) {
    return { ok: false, error: "Syntax error: " + message(error) };
  }

  const names: string[] = [];
  const edits: { start: number; end: number; text: string }[] = [];
  for (const node of program.body) {
    switch (node.type) {
      case "ExportNamedDeclaration":
      case "ExportDefaultDeclaration":
      case "ExportAllDeclaration":
        return {
          ok: false,
          error:
            "`export` isn't needed in a notebook: top-level names are shared with the cells below automatically.",
        };
      case "ImportDeclaration": {
        const from = JSON.stringify(String(node.source.value));
        const parts = node.specifiers.map((s) => {
          names.push(s.local.name);
          if (s.type === "ImportNamespaceSpecifier")
            return `const ${s.local.name} = __require(${from});`;
          if (s.type === "ImportDefaultSpecifier")
            return `const ${s.local.name} = __require(${from}).default;`;
          const imported =
            s.imported.type === "Identifier" ? s.imported.name : String(s.imported.value);
          return `const ${s.local.name} = __require(${from})[${JSON.stringify(imported)}];`;
        });
        edits.push({
          start: node.start,
          end: node.end,
          text: parts.join(" ") || `__require(${from});`,
        });
        break;
      }
      case "VariableDeclaration":
        names.push(...node.declarations.flatMap((d) => patternNames(d.id)));
        break;
      case "FunctionDeclaration":
      case "ClassDeclaration":
        if (node.id) names.push(node.id.name);
        break;
    }
  }

  const last = program.body.at(-1);
  const returnsLast = last?.type === "ExpressionStatement";
  if (last?.type === "ExpressionStatement") {
    const expr = js.slice(last.expression.start, last.expression.end);
    edits.push({ start: last.start, end: last.end, text: `const __result = (${expr});` });
  }

  let body = js;
  for (const e of edits.sort((a, b) => b.start - a.start)) {
    body = body.slice(0, e.start) + e.text + body.slice(e.end);
  }
  const unique = [...new Set(names)];
  if (unique.length) body += `\nObject.assign(globalThis, { ${unique.join(", ")} });`;
  if (returnsLast) body += "\nreturn __result;";
  return { ok: true, body, names: unique };
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run src/infrastructure/notebook-runtime/transform-cell.test.ts`
Expected: PASS (8 tests). sucrase's `typescript` transform always removes `import type`, so the type-only test needs no special case; if it fails, report it rather than working around it.

- [ ] **Step 6: Write the kernel worker**

`src/infrastructure/notebook-runtime/kernel.worker.ts`:

```ts
import * as langgraph from "@langchain/langgraph/web";
import * as prebuilt from "@langchain/langgraph/prebuilt";
import * as messages from "@langchain/core/messages";
import * as prompts from "@langchain/core/prompts";
import * as tools from "@langchain/core/tools";
import * as openai from "@langchain/openai";
import * as zod from "zod";
import { NOTEBOOK_MAX_TOKENS, NOTEBOOK_MODEL } from "@/domain/notebook/chat-proxy";
import type { KernelEvent, KernelRequest } from "@/domain/notebook/kernel-protocol";
import type { CellOutput } from "@/domain/notebook/notebook";
import { transformCell } from "./transform-cell";

// The notebook kernel: a module Web Worker that keeps variables between cells until restarted.
// Client-side code that lives in infrastructure/ because only this layer may import @langchain/*
// (docs/02-decisions.md). The UI starts it with new Worker(new URL(...)), which is not an import.

/** What notebook code may import. "@langchain/langgraph" is the browser build (no AsyncLocalStorage). */
const MODULES: Record<string, unknown> = {
  "@langchain/langgraph": langgraph,
  "@langchain/langgraph/web": langgraph,
  "@langchain/langgraph/prebuilt": prebuilt,
  "@langchain/openai": openai,
  "@langchain/core/messages": messages,
  "@langchain/core/prompts": prompts,
  "@langchain/core/tools": tools,
  zod,
};

function __require(name: string): unknown {
  if (name in MODULES) return MODULES[name];
  throw new Error(
    `\`${name}\` isn't available in the notebook. Available: ${Object.keys(MODULES).join(", ")}`,
  );
}

type Run = (require: typeof __require) => Promise<unknown>;
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => Run;

let current = 0;
const send = (event: KernelEvent) => self.postMessage(event);
const emit = (output: CellOutput) => send({ type: "output", runId: current, output });

/** Printable data: messages become { type, content, tool_calls }; deep or cyclic objects stop at depth 6. */
function plain(value: unknown, depth = 0): unknown {
  if (messages.isBaseMessage(value)) {
    const calls =
      "tool_calls" in value && Array.isArray(value.tool_calls) && value.tool_calls.length;
    return {
      type: value.getType(),
      content: value.content,
      ...(calls ? { tool_calls: value.tool_calls } : {}),
    };
  }
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => plain(v, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v, depth + 1)]));
}

function format(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return (
      JSON.stringify(plain(value), (_, v) => (typeof v === "bigint" ? String(v) : v), 2) ??
      String(value)
    );
  } catch {
    return String(value);
  }
}

const errorText = (e: unknown) =>
  e instanceof Error
    ? [`${e.name}: ${e.message}`, ...(e.stack ?? "").split("\n").slice(1, 4)].join("\n")
    : String(e);

// ponytail: output from a timer started in an earlier cell is shown under the cell running now.
for (const level of ["log", "info", "warn", "error"] as const) {
  console[level] = (...args: unknown[]) =>
    emit({ type: level === "error" ? "error" : "log", text: args.map(format).join(" ") });
}

type Drawable = { getGraphAsync(config?: { xray?: boolean }): Promise<{ drawMermaid(): string }> };

Object.assign(globalThis, {
  /** gpt-4o-mini through the admin-only proxy. The dummy key never leaves the browser: the server adds the real one. */
  model: new openai.ChatOpenAI({
    model: NOTEBOOK_MODEL,
    apiKey: "notebook-proxy",
    maxTokens: NOTEBOOK_MAX_TOKENS,
    useResponsesApi: false,
    configuration: { baseURL: new URL("/api/learn/openai/v1", self.location.origin).href },
  }),
  /** Draws a compiled graph under the cell. `{ xray: true }` opens subgraphs. */
  show: async (graph: Drawable, opts?: { xray?: boolean }) => {
    const drawing = await graph.getGraphAsync({ xray: opts?.xray });
    emit({ type: "graph", text: drawing.drawMermaid() });
  },
});

self.onmessage = async (e: MessageEvent<KernelRequest>) => {
  current = e.data.runId;
  const runId = current;
  const cell = transformCell(e.data.source);
  if (!cell.ok) {
    emit({ type: "error", text: cell.error });
    return send({ type: "done", runId, ok: false });
  }
  try {
    const result = await new AsyncFunction("__require", cell.body)(__require);
    if (result !== undefined) emit({ type: "log", text: format(result) });
    send({ type: "done", runId, ok: true });
  } catch (error) {
    emit({ type: "error", text: errorText(error) });
    send({ type: "done", runId, ok: false });
  }
};
```

If `useResponsesApi` is reported as an unknown option by `tsc`, remove that line (the installed 1.7.1 `.d.ts` declares it at `dist/chat_models/index.d.ts:19`, so it should be accepted).

- [ ] **Step 7: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS. (The worker is checked by `tsc` under the `dom` lib: `self` is `Window & typeof globalThis`, and `self.postMessage(event)` matches the `postMessage(message, options?)` overload.)

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml src/infrastructure/notebook-runtime
git commit -m "feat(notebook): add cell transform and browser kernel worker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Starter notebooks and exercises

**Files:**

- Modify: `src/domain/notebook/templates.ts` (replace the placeholder `TEMPLATES`)
- Test: `src/infrastructure/notebook-runtime/templates.test.ts`

**Interfaces:**

- Consumes: `TemplateId`, `TEMPLATE_IDS`, `Template`, `TemplateCell` (Tasks 1, 3); `transformCell` (Task 5).
- Produces: `TEMPLATES: Record<TemplateId, Template>` with real content.

Sources (Python, in `/Users/devsakar/Desktop/Learn/langgraph/langgraph-tutorials/`): 1_bmi, 2_simple_llm, 3_prompt_chaining, 4_batsman, 5_UPSC_essay, 6_quadratic, 7_review_reply, 8_X_post_generator, 9_basic_chatbot, 10_persistence, 11_tools, 14_hitl, 15_subgraphs, 15_subgraph_shared, chatbot_with_hitl. Each template credits its tutorials in the first markdown cell. Text and examples are our own; only the ideas and graph shapes are reused.

- [ ] **Step 1: Write the failing test**

`src/infrastructure/notebook-runtime/templates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cellsSchema } from "@/domain/notebook/notebook";
import { TEMPLATES, TEMPLATE_IDS } from "@/domain/notebook/templates";
import { transformCell } from "./transform-cell";

const ALLOWED = [
  "@langchain/langgraph",
  "@langchain/langgraph/web",
  "@langchain/langgraph/prebuilt",
  "@langchain/openai",
  "@langchain/core/messages",
  "@langchain/core/prompts",
  "@langchain/core/tools",
  "zod",
];

describe.each(TEMPLATE_IDS)("template %s", (id) => {
  const t = TEMPLATES[id];

  it("has a title, a credit and a 'Your turn' section", () => {
    expect(t.title.length).toBeGreaterThan(3);
    expect(t.cells[0]?.kind).toBe("markdown");
    expect(t.cells[0]?.source).toMatch(/langgraph-tutorials/);
    expect(t.cells.some((c) => c.kind === "markdown" && c.source.includes("## Your turn"))).toBe(
      true,
    );
  });

  it("is valid as saved cells", () => {
    const cells = t.cells.map((c, i) => ({ id: String(i), ...c }));
    expect(cellsSchema.safeParse(cells).success).toBe(true);
  });

  it("every code cell compiles and imports only allowed packages", () => {
    for (const cell of t.cells.filter((c) => c.kind === "code")) {
      const program = transformCell(cell.source);
      expect(program.ok ? "ok" : program.error).toBe("ok");
      for (const [, name] of cell.source.matchAll(/from "([^"]+)"/g))
        expect(ALLOWED).toContain(name);
      // One state API across the lessons and the notebooks (plan 1 uses StateSchema).
      expect(cell.source).not.toMatch(/Annotation/);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/infrastructure/notebook-runtime/templates.test.ts`
Expected: FAIL ("has a title, a credit…" fails on the placeholder content).

- [ ] **Step 3: Replace `TEMPLATES` with the real content**

In `src/domain/notebook/templates.ts`, delete the placeholder `TEMPLATES` export from Task 3 (keep `TemplateCell`, `Template`, `TEMPLATE_IDS`, `TemplateId`, `isTemplateId`) and add:

```ts
// Markdown: plain strings (backticks are fine). Code: the `code` tag keeps backslashes as typed
// (String.raw), so "\n" inside cell code stays an escape. No backticks or "${" inside code cells.
const md = (...lines: string[]): TemplateCell => ({ kind: "markdown", source: lines.join("\n") });
const code = (strings: TemplateStringsArray): TemplateCell => ({
  kind: "code",
  source: String.raw({ raw: strings.raw }).trim(),
});
const credit = (files: string) =>
  "Based on " + files + " in the langgraph-tutorials repo (Python), rewritten in TypeScript.";
const howTo =
  "Run a cell with **Shift+Enter**. Names declared in one cell are visible in the cells below. `model` (gpt-4o-mini) and `show(graph)` are ready to use.";

export const TEMPLATES: Record<TemplateId, Template> = {
  "lg-greet": {
    title: "LangGraph 1: a simple LLM call",
    cells: [
      md(
        "# LangGraph 1: a simple LLM call",
        "",
        howTo,
        "",
        credit("*1_bmi_workflow* and *2_simple_llm_workflow*"),
      ),
      code`
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Warm-up: a graph with no model",
        "",
        "State is one shared object, described with **Zod** in a `StateSchema`. Inputs are plain fields; fields a node fills in get a `.default(...)`. Each node returns **only the fields it changed**.",
      ),
      code`
const Bmi = new StateSchema({
  weightKg: z.number(),
  heightM: z.number(),
  bmi: z.number().default(0),
  category: z.string().default(""),
});

const bmiGraph = new StateGraph(Bmi)
  .addNode("calculate", (s) => ({ bmi: Math.round((s.weightKg / s.heightM ** 2) * 100) / 100 }))
  .addNode("label", (s) => ({
    category: s.bmi < 18.5 ? "Underweight" : s.bmi < 25 ? "Normal" : s.bmi < 30 ? "Overweight" : "Obese",
  }))
  .addEdge(START, "calculate")
  .addEdge("calculate", "label")
  .addEdge("label", END)
  .compile();

await show(bmiGraph);
await bmiGraph.invoke({ weightKg: 80, heightM: 1.73 });
// Expected: bmi 26.73, category "Overweight"`,
      md(
        "## One model call",
        "",
        "The same shape, but the node calls the model. The graph adds a shared state and a trace you can draw.",
      ),
      code`
const Qa = new StateSchema({ question: z.string(), answer: z.string().default("") });

const qaGraph = new StateGraph(Qa)
  .addNode("ask", async (s) => ({ answer: (await model.invoke("Answer in two sentences: " + s.question)).text }))
  .addEdge(START, "ask")
  .addEdge("ask", END)
  .compile();

await show(qaGraph);
await qaGraph.invoke({ question: "How far is the moon from the earth?" });`,
      md(
        "## Your turn",
        "",
        "1. Add a node `shorten` after `ask` that cuts `answer` to one sentence and saves it in a new state field `short`.",
        "2. Give the BMI graph a third node `advise` that writes one line of advice for the category. No model needed.",
      ),
      code`
// TODO 1: copy qaGraph, add "short" to the state and a "shorten" node between "ask" and END.
// Expected: show() draws START -> ask -> shorten -> END; invoke returns { question, answer, short }.
`,
      code`
// TODO 2: add an "advise" node after "label".
// Expected: invoke({ weightKg: 50, heightM: 1.8 }) returns category "Underweight" and an "advice" line.
`,
    ],
  },

  "lg-chain": {
    title: "LangGraph 2: prompt chaining",
    cells: [
      md(
        "# LangGraph 2: prompt chaining",
        "",
        howTo,
        "",
        credit(
          "*3_prompt_chaining* (the chain) and *7_review_reply_workflow* (the conditional edge)",
        ),
      ),
      code`
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## A chain with a gate",
        "",
        "Step 1's output is step 2's input. Between them, **plain code** checks the outline and can stop the chain.",
      ),
      code`
const Chain = new StateSchema({
  topic: z.string(),
  outline: z.string().default(""),
  tweet: z.string().default(""),
});

const bulletCount = (text: string) => text.split("\n").filter((line) => /^\s*[-*•]/.test(line)).length;

const chain = new StateGraph(Chain)
  .addNode("writeOutline", async (s) => ({
    outline: (await model.invoke("Write exactly 3 short bullet points, each starting with -, outlining a tweet about: " + s.topic)).text,
  }))
  .addNode("writeTweet", async (s) => ({
    tweet: (await model.invoke("Write one tweet under 280 characters from this outline:\n" + s.outline)).text,
  }))
  .addEdge(START, "writeOutline")
  // The gate: go on only with exactly 3 bullets. The list names every place the edge can go.
  .addConditionalEdges("writeOutline", (s) => (bulletCount(s.outline) === 3 ? "writeTweet" : END), ["writeTweet", END])
  .addEdge("writeTweet", END)
  .compile();

await show(chain);
await chain.invoke({ topic: "why LangGraph keeps one shared state" });`,
      md(
        "## Your turn",
        "",
        "1. Pull the gate out into `function gate(s)` and test it **without the model**.",
        "2. Add a third step `addHashtags` after `writeTweet` that appends two hashtags.",
      ),
      code`
// TODO 1: function gate(s: { outline: string }) { ... }
// Expected: gate({ outline: "- a\n- b\n- c" }) === "writeTweet" and gate({ outline: "- a\n- b" }) === END ("__end__").
`,
      code`
// TODO 2: rebuild the chain with an "addHashtags" node and a "hashtags" state field.
// Expected: show() draws writeOutline -> writeTweet -> addHashtags, and the gate still skips both when it fails.
`,
    ],
  },

  "lg-route": {
    title: "LangGraph 3: routing",
    cells: [
      md(
        "# LangGraph 3: routing",
        "",
        howTo,
        "",
        credit("*6_quadratic_equation_workflow* (warm-up) and *7_review_reply_workflow*"),
      ),
      code`
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Warm-up: a three-way branch with no model",
        "",
        "A **conditional edge** runs a function on the state and goes to the node it names.",
      ),
      code`
const Quad = new StateSchema({
  a: z.number(),
  b: z.number(),
  c: z.number(),
  disc: z.number().default(0),
  result: z.string().default(""),
});

const quad = new StateGraph(Quad)
  .addNode("discriminant", (s) => ({ disc: s.b ** 2 - 4 * s.a * s.c }))
  .addNode("twoRoots", (s) => ({
    result: "Roots " + (-s.b + Math.sqrt(s.disc)) / (2 * s.a) + " and " + (-s.b - Math.sqrt(s.disc)) / (2 * s.a),
  }))
  .addNode("oneRoot", (s) => ({ result: "Repeated root " + -s.b / (2 * s.a) }))
  .addNode("noRoots", () => ({ result: "No real roots" }))
  .addEdge(START, "discriminant")
  .addConditionalEdges(
    "discriminant",
    (s) => (s.disc > 0 ? "twoRoots" : s.disc === 0 ? "oneRoot" : "noRoots"),
    ["twoRoots", "oneRoot", "noRoots"],
  )
  .addEdge("twoRoots", END)
  .addEdge("oneRoot", END)
  .addEdge("noRoots", END)
  .compile();

await show(quad);
[await quad.invoke({ a: 1, b: -3, c: 2 }), await quad.invoke({ a: 2, b: 4, c: 2 }), await quad.invoke({ a: 1, b: 0, c: 1 })].map((r) => r.result)
// Expected: two roots (2 and 1), a repeated root (-1), no real roots`,
      md(
        "## The model picks the route",
        "",
        "A classifier with a **Zod schema** returns one of three labels; the edge sends the question to that specialist.",
      ),
      code`
const ROUTES = ["billing", "technical", "general"] as const;
const Route = z.object({ route: z.enum(ROUTES) });

const Support = new StateSchema({
  question: z.string(),
  route: z.enum(ROUTES).default("general"),
  reply: z.string().default(""),
});

const specialist = (role: string) => async (s: typeof Support.State) => ({
  reply: (await model.invoke("You are a " + role + ". Answer in two sentences: " + s.question)).text,
});

const support = new StateGraph(Support)
  .addNode("classify", async (s) =>
    model.withStructuredOutput(Route).invoke("Classify this support question as billing, technical or general: " + s.question),
  )
  .addNode("billing", specialist("billing specialist"))
  .addNode("technical", specialist("support engineer"))
  .addNode("general", specialist("friendly support agent"))
  .addEdge(START, "classify")
  .addConditionalEdges("classify", (s) => s.route, ["billing", "technical", "general"])
  .addEdge("billing", END)
  .addEdge("technical", END)
  .addEdge("general", END)
  .compile();

await show(support);
await support.invoke({ question: "I was charged twice this month." });
// Expected: route "billing" and a billing reply`,
      md(
        "## Your turn",
        "",
        "Build the review-reply bot from tutorial 7: classify a product review as `positive` or `negative`.",
        "Positive → `thank`. Negative → `diagnose` (Zod: issueType, tone, urgency) → `resolve`.",
      ),
      code`
// TODO: const review = new StateGraph(...)
// Try: "The login screen freezes every time, even after reinstalling."
// Expected: show() draws both branches; this review runs classify -> diagnose -> resolve and never "thank";
// diagnosis is roughly { issueType: "Bug", tone: "frustrated", urgency: "high" }.
`,
    ],
  },

  "lg-parallel": {
    title: "LangGraph 4: parallelization",
    cells: [
      md(
        "# LangGraph 4: parallelization",
        "",
        howTo,
        "",
        credit("*4_batsman_workflow* (warm-up) and *5_UPSC_essay_workflow*"),
      ),
      code`
import { StateGraph, StateSchema, ReducedValue, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Warm-up: fan out, fan in",
        "",
        "Three edges from START run three nodes **in the same step**. `addEdge([a, b, c], join)` waits for all three.",
      ),
      code`
const Bat = new StateSchema({
  runs: z.number(),
  balls: z.number(),
  fours: z.number(),
  sixes: z.number(),
  strikeRate: z.number().default(0),
  ballsPerBoundary: z.number().default(0),
  boundaryPct: z.number().default(0),
  report: z.string().default(""),
});

const batting = new StateGraph(Bat)
  .addNode("calcStrikeRate", (s) => ({ strikeRate: (s.runs / s.balls) * 100 }))
  .addNode("calcBallsPerBoundary", (s) => ({ ballsPerBoundary: s.balls / (s.fours + s.sixes) }))
  .addNode("calcBoundaryPct", (s) => ({ boundaryPct: ((s.fours * 4 + s.sixes * 6) / s.runs) * 100 }))
  .addNode("summary", (s) => ({
    report: "SR " + s.strikeRate + " | balls per boundary " + s.ballsPerBoundary + " | boundary% " + s.boundaryPct,
  }))
  .addEdge(START, "calcStrikeRate")
  .addEdge(START, "calcBallsPerBoundary")
  .addEdge(START, "calcBoundaryPct")
  .addEdge(["calcStrikeRate", "calcBallsPerBoundary", "calcBoundaryPct"], "summary")
  .addEdge("summary", END)
  .compile();

await show(batting);
(await batting.invoke({ runs: 100, balls: 50, fours: 6, sixes: 4 })).report
// Expected: "SR 200 | balls per boundary 5 | boundary% 48"`,
      md(
        "## Three model calls at once",
        "",
        "Each branch writes **its own** state field, so no merging rule is needed.",
      ),
      code`
const Review = new StateSchema({
  review: z.string(),
  sentiment: z.string().default(""),
  summary: z.string().default(""),
  keyPoints: z.string().default(""),
  report: z.string().default(""),
});

const ask = async (prompt: string) => (await model.invoke(prompt)).text;

const reviewGraph = new StateGraph(Review)
  .addNode("rateSentiment", async (s) => ({ sentiment: await ask("One word, positive/negative/mixed: " + s.review) }))
  .addNode("summarise", async (s) => ({ summary: await ask("Summarise in one line: " + s.review) }))
  .addNode("findPoints", async (s) => ({ keyPoints: await ask("List the 3 key points, one per line: " + s.review) }))
  .addNode("join", (s) => ({ report: "Sentiment: " + s.sentiment + "\nSummary: " + s.summary + "\nKey points:\n" + s.keyPoints }))
  .addEdge(START, "rateSentiment")
  .addEdge(START, "summarise")
  .addEdge(START, "findPoints")
  .addEdge(["rateSentiment", "summarise", "findPoints"], "join")
  .addEdge("join", END)
  .compile();

await show(reviewGraph);
(await reviewGraph.invoke({ review: "Battery lasts two days and the screen is lovely, but it gets hot while charging." })).report`,
      md(
        "## Your turn",
        "",
        "Three judges score an essay and all write into **one** field, `scores`. Run the cell as it is first.",
      ),
      code`
const Score = z.object({ score: z.number().int().min(0).max(10) });

// TODO: run once as is, read the error, then give "scores" a reducer:
//   scores: new ReducedValue(z.array(z.number()).default(() => []), {
//     reducer: (current, next) => current.concat(next),
//   }),
const Essay = new StateSchema({
  essay: z.string(),
  scores: z.array(z.number()).default(() => []),
  average: z.number().default(0),
});

const judge = (aspect: string) => async (s: typeof Essay.State) => {
  const { score } = await model.withStructuredOutput(Score).invoke("Score the " + aspect + " of this essay from 0 to 10:\n" + s.essay);
  return { scores: [score] };
};

const essayGraph = new StateGraph(Essay)
  .addNode("language", judge("language"))
  .addNode("analysis", judge("depth of analysis"))
  .addNode("clarity", judge("clarity of thought"))
  .addNode("final", (s) => ({ average: s.scores.reduce((x, y) => x + y, 0) / s.scores.length }))
  .addEdge(START, "language")
  .addEdge(START, "analysis")
  .addEdge(START, "clarity")
  .addEdge(["language", "analysis", "clarity"], "final")
  .addEdge("final", END)
  .compile();

await essayGraph.invoke({ essay: "India's digital payments grew fast because UPI made small payments free and instant." });
// Expected first: an InvalidUpdateError (three nodes wrote "scores" in one step).
// Expected after the fix: scores has 3 numbers and average is their mean.`,
    ],
  },

  "lg-orchestrate": {
    title: "LangGraph 5: orchestrator-workers",
    cells: [
      md(
        "# LangGraph 5: orchestrator-workers",
        "",
        howTo,
        "",
        credit("the reducer pattern in *5_UPSC_essay_workflow*") +
          " The tutorials have no `Send` example; this one is ours.",
      ),
      code`
import { StateGraph, StateSchema, ReducedValue, START, END, Send } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Plan, then one worker per subtask",
        "",
        'The planner decides **how many** workers run. `Send("work", job)` starts one `work` node per subtask, all in the same step. Each worker gets only its job (`{ input: WorkerJob }`), and a reducer collects their results.',
      ),
      code`
const Plan = z.object({ subtasks: z.array(z.string()).min(2).max(3) });

const Job = new StateSchema({
  goal: z.string(),
  subtasks: z.array(z.string()).default(() => []),
  results: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (current, next) => current.concat(next),
  }),
  answer: z.string().default(""),
});
/** What Send hands one worker: its own job, not the whole state. */
const WorkerJob = new StateSchema({ goal: z.string(), task: z.string() });

const orchestrator = new StateGraph(Job)
  .addNode("plan", async (s) =>
    model.withStructuredOutput(Plan).invoke("Split this goal into 2 or 3 short subtasks: " + s.goal),
  )
  .addNode(
    "work",
    async (job) => ({
      results: [(await model.invoke("Do this subtask in two sentences: " + job.task + "\n(Overall goal: " + job.goal + ")")).text],
    }),
    { input: WorkerJob },
  )
  .addNode("synthesize", async (s) => ({
    answer: (await model.invoke("Combine these into one short answer for the goal '" + s.goal + "':\n" + s.results.join("\n---\n"))).text,
  }))
  .addEdge(START, "plan")
  // ["work"] tells the drawing where Send can go; without it every node gets a dotted edge.
  .addConditionalEdges("plan", (s) => s.subtasks.slice(0, 3).map((t) => new Send("work", { goal: s.goal, task: t })), ["work"])
  .addEdge("work", "synthesize")
  .addEdge("synthesize", END)
  .compile();

await show(orchestrator);
await orchestrator.invoke({ goal: "Plan a one-day trip to Pokhara on a student budget" });`,
      md(
        "## Your turn",
        "",
        "1. Watch the workers run with `stream`.",
        "2. Add a `review` node after `synthesize` that lists one weakness of the answer.",
      ),
      code`
// TODO 1:
// for await (const chunk of await orchestrator.stream({ goal: "..." }, { streamMode: "updates" })) console.log(Object.keys(chunk));
// Expected: plan, then one "work" line per subtask (2 or 3), then synthesize.
`,
      code`
// TODO 2: rebuild with a "review" node and a "weakness" state field.
// Expected: show() draws plan -> work -> synthesize -> review -> END.
`,
    ],
  },

  "lg-evaluate": {
    title: "LangGraph 6: evaluator-optimizer",
    cells: [
      md("# LangGraph 6: evaluator-optimizer", "", howTo, "", credit("*8_X_post_generator*")),
      code`
import { StateGraph, StateSchema, ReducedValue, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Write, grade, rewrite: a loop",
        "",
        "An edge can point **back**. The router ends the loop on a pass or after 3 rounds, so it can't run forever.",
      ),
      code`
const Grade = z.object({ pass: z.boolean(), feedback: z.string() });

const Loop = new StateSchema({
  idea: z.string(),
  draft: z.string().default(""),
  passed: z.boolean().default(false),
  feedback: z.string().default(""),
  round: z.number().default(0),
  history: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (current, next) => current.concat(next),
  }),
});

const MAX_ROUNDS = 3;

const loop = new StateGraph(Loop)
  .addNode("write", async (s) => {
    const prompt = s.feedback
      ? "Rewrite this tagline using the feedback.\nFeedback: " + s.feedback + "\nTagline: " + s.draft
      : "Write a tagline under 12 words for: " + s.idea;
    const draft = (await model.invoke(prompt)).text;
    return { draft, round: s.round + 1, history: [draft] };
  })
  .addNode("evaluate", async (s) => {
    const grade = await model
      .withStructuredOutput(Grade)
      .invoke("Pass only if this tagline says what makes the product different and has no cliches. Tagline: " + s.draft);
    return { passed: grade.pass, feedback: grade.feedback };
  })
  .addEdge(START, "write")
  .addEdge("write", "evaluate")
  .addConditionalEdges("evaluate", (s) => (s.passed || s.round >= MAX_ROUNDS ? END : "write"), ["write", END])
  .compile();

await show(loop);
const out = await loop.invoke({ idea: "a bike lock that texts you when someone touches it" });
({ rounds: out.round, final: out.draft, history: out.history })`,
      md(
        "## Your turn",
        "",
        "1. Make the loop stop after 2 rounds instead of 3.",
        "2. Remove the reducer from `history` and run again.",
      ),
      code`
// TODO 1: change the exit condition.
// Expected: "rounds" is never more than 2, even when every grade fails.
`,
      code`
// TODO 2: history: z.array(z.string()).default(() => []), (no reducer)
// Expected: only the last draft survives, because each write replaces the list instead of adding to it.
`,
    ],
  },

  tools: {
    title: "Tools and the ReAct loop",
    cells: [
      md(
        "# Tools and the ReAct loop",
        "",
        howTo,
        "",
        credit("*9_basic_chatbot* and *11_tools*") +
          " The browser can't call outside APIs, so the stock prices here are fake.",
      ),
      code`
import { StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";`,
      md(
        "## Two tools",
        "",
        "A tool is a function plus a name, a description and a Zod schema. The model reads the description to decide when to call it.",
      ),
      code`
const calculator = tool(
  ({ a, b, op }) => String({ add: a + b, sub: a - b, mul: a * b, div: b === 0 ? NaN : a / b }[op]),
  {
    name: "calculator",
    description: "Do arithmetic on two numbers.",
    schema: z.object({ a: z.number(), b: z.number(), op: z.enum(["add", "sub", "mul", "div"]) }),
  },
);

const PRICES: Record<string, number> = { AAPL: 227.5, TSLA: 251.2, MSFT: 415.1 };
const getStockPrice = tool(
  ({ symbol }) => (symbol in PRICES ? String(PRICES[symbol]) : "Unknown symbol " + symbol),
  { name: "get_stock_price", description: "Latest price of a stock in USD (fake data).", schema: z.object({ symbol: z.string() }) },
);

const tools = [calculator, getStockPrice];
const llm = model.bindTools(tools);`,
      md(
        "## The loop",
        "",
        "`chat` answers or asks for tools. `toolsCondition` sends tool calls to the `tools` node, which runs them and goes back to `chat`.",
      ),
      code`
// A chat's state is its message list. MessagesValue is a ready-made field whose reducer appends.
const Chat = new StateSchema({ messages: MessagesValue });

const agent = new StateGraph(Chat)
  .addNode("chat", async (s) => ({ messages: [await llm.invoke(s.messages)] }))
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "chat")
  .addConditionalEdges("chat", toolsCondition, ["tools", END])
  .addEdge("tools", "chat")
  .compile();

await show(agent);
const run = await agent.invoke({ messages: [new HumanMessage("What do 50 AAPL shares cost?")] });
run.messages.map((m) => m.getType() + ": " + (m.text || JSON.stringify(m.tool_calls)))
// Expected: human, ai (calls get_stock_price), tool 227.5, ai (calls calculator), tool 11375, ai answer with 11375`,
      md(
        "## Your turn",
        "",
        "Add a fake `convert_currency` tool (1 USD = 84 INR) and ask for the cost in rupees.",
      ),
      code`
// TODO: const convertCurrency = tool(...); rebuild the agent with three tools.
// Ask: "What do 50 AAPL shares cost in rupees?"
// Expected: the agent calls get_stock_price, calculator and convert_currency, and answers 955500.
`,
    ],
  },

  memory: {
    title: "Memory: checkpoints, threads, time travel",
    cells: [
      md(
        "# Memory: checkpoints, threads, time travel",
        "",
        howTo,
        "",
        credit("*10_persistence* and *chatbot_without_hitl*"),
      ),
      code`
import { StateGraph, StateSchema, ReducedValue, MessagesValue, MemorySaver, START, END } from "@langchain/langgraph";
import { HumanMessage, trimMessages } from "@langchain/core/messages";
import { z } from "zod";`,
      md(
        "## Threads",
        "",
        "A **checkpointer** saves the state after every step. A `thread_id` picks which saved conversation to continue. `MemorySaver` lives in this kernel, so **Restart** clears it.",
      ),
      code`
const Chat = new StateSchema({ messages: MessagesValue });

const chatbot = new StateGraph(Chat)
  .addNode("chat", async (s) => ({ messages: [await model.invoke(s.messages)] }))
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({ checkpointer: new MemorySaver() });

const thread1 = { configurable: { thread_id: "1" } };
await chatbot.invoke({ messages: [new HumanMessage("Hi, my name is Asha.")] }, thread1);
(await chatbot.invoke({ messages: [new HumanMessage("What is my name?")] }, thread1)).messages.at(-1)?.text
// Expected: it says Asha.`,
      code`
const thread2 = { configurable: { thread_id: "2" } };
(await chatbot.invoke({ messages: [new HumanMessage("What is my name?")] }, thread2)).messages.at(-1)?.text
// Expected: it doesn't know. Thread 2 has its own memory.`,
      md(
        "## Time travel",
        "",
        "`getStateHistory` lists every checkpoint, newest first. `updateState` on an old one makes a **fork** you can run from.",
      ),
      code`
const Joke = new StateSchema({
  topic: z.string(),
  joke: z.string().default(""),
  explanation: z.string().default(""),
});

const jokes = new StateGraph(Joke)
  .addNode("tellJoke", async (s) => ({ joke: (await model.invoke("One short joke about " + s.topic)).text }))
  .addNode("explain", async (s) => ({ explanation: (await model.invoke("Explain this joke in one line: " + s.joke)).text }))
  .addEdge(START, "tellJoke")
  .addEdge("tellJoke", "explain")
  .addEdge("explain", END)
  .compile({ checkpointer: new MemorySaver() });

const jokeThread = { configurable: { thread_id: "jokes" } };
await jokes.invoke({ topic: "pizza" }, jokeThread);

const history = [];
for await (const snap of jokes.getStateHistory(jokeThread)) history.push(snap);
history.map((h) => ({ next: h.next, topic: h.values.topic, joke: h.values.joke }))`,
      code`
const beforeJoke = history.find((h) => h.next[0] === "tellJoke");
const forked = await jokes.updateState(beforeJoke.config, { topic: "samosa" });
(await jokes.invoke(null, forked)).joke
// Expected: a samosa joke. getStateHistory(jokeThread) now shows both branches.`,
      md(
        "## Crash and resume",
        "",
        "If a step fails, the checkpoints before it are kept. Invoking with `null` continues from the failed step.",
      ),
      code`
let failOnce = true;
const Steps = new StateSchema({
  log: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (current, next) => current.concat(next),
  }),
});

const fragile = new StateGraph(Steps)
  .addNode("step1", () => {
    console.log("step 1 ran");
    return { log: ["step1"] };
  })
  .addNode("step2", () => {
    if (failOnce) {
      failOnce = false;
      throw new Error("Simulated crash in step 2");
    }
    return { log: ["step2"] };
  })
  .addNode("step3", () => ({ log: ["step3"] }))
  .addEdge(START, "step1")
  .addEdge("step1", "step2")
  .addEdge("step2", "step3")
  .addEdge("step3", END)
  .compile({ checkpointer: new MemorySaver() });

const crashThread = { configurable: { thread_id: "crash" } };
try {
  await fragile.invoke({}, crashThread);
} catch (e) {
  console.log("Crashed:", e.message);
}`,
      code`
(await fragile.invoke(null, crashThread)).log
// Expected: "step 1 ran" is NOT printed again, and log is ["step1", "step2", "step3"].`,
      md(
        "## Your turn",
        "",
        "Long chats get expensive. Keep only the last 4 messages before calling the model.",
      ),
      code`
// TODO: in "chat", call the model with
//   await trimMessages(s.messages, { maxTokens: 4, tokenCounter: (msgs) => msgs.length, strategy: "last", startOn: "human" })
// (tokenCounter counts messages here, so maxTokens: 4 means "4 messages").
// Expected: after 4 more turns on a new thread, the bot no longer knows the name from the first turn.
`,
    ],
  },

  hitl: {
    title: "Human in the loop: approve before acting",
    cells: [
      md(
        "# Human in the loop: approve before acting",
        "",
        howTo,
        "",
        credit("*14_hitl* and *chatbot_with_hitl*"),
        "",
        "Those tutorials pause with `interrupt()`. In the **browser build** of LangGraph, `interrupt()` may not work (it needs Node's AsyncLocalStorage). Run the first cell to check; the rest uses `interruptBefore`, which works everywhere.",
      ),
      code`
import { StateGraph, StateSchema, MemorySaver, START, END, interrupt, Command } from "@langchain/langgraph";
import { z } from "zod";`,
      code`
// Smoke test: does interrupt() work in this kernel?
const Probe = new StateSchema({ answer: z.string().default("") });
const probe = new StateGraph(Probe)
  .addNode("ask", () => ({ answer: interrupt("Approve?") }))
  .addEdge(START, "ask")
  .addEdge("ask", END)
  .compile({ checkpointer: new MemorySaver() });

const probeThread = { configurable: { thread_id: "probe" } };
try {
  const paused = await probe.invoke({}, probeThread);
  console.log("interrupt() works here. Paused with:", paused.__interrupt__);
  console.log("Resumed:", await probe.invoke(new Command({ resume: "yes" }), probeThread));
} catch (e) {
  console.log("interrupt() is not available in the browser build:", e.message, "-> use interruptBefore below.");
}`,
      md(
        "## Pause before the risky step",
        "",
        '`interruptBefore: ["buy"]` stops the graph just before `buy`. You look at the saved state, then either continue or change it.',
      ),
      code`
const Order = z.object({ symbol: z.string(), quantity: z.number().int().positive() });

const Trade = new StateSchema({
  request: z.string(),
  order: Order.optional(),
  status: z.string().default(""),
});

const trader = new StateGraph(Trade)
  .addNode("parseOrder", async (s) => ({
    order: await model.withStructuredOutput(Order).invoke("Extract the stock order (ticker symbol and quantity): " + s.request),
  }))
  .addNode("buy", (s) => ({ status: "Bought " + s.order.quantity + " " + s.order.symbol + " (simulated)" }))
  .addEdge(START, "parseOrder")
  .addEdge("parseOrder", "buy")
  .addEdge("buy", END)
  .compile({ checkpointer: new MemorySaver(), interruptBefore: ["buy"] });

await show(trader);
const tradeThread = { configurable: { thread_id: "trade-1" } };
await trader.invoke({ request: "Buy 10 shares of Tesla" }, tradeThread);
const paused = await trader.getState(tradeThread);
({ next: paused.next, order: paused.values.order })
// Expected: next is ["buy"]: the graph stopped and waits for you.`,
      code`
// Approve: continue from where it stopped.
(await trader.invoke(null, tradeThread)).status
// Expected: "Bought 10 TSLA (simulated)"`,
      code`
// Reject: write the outcome as if "buy" had run, so it never does.
const rejectThread = { configurable: { thread_id: "trade-2" } };
await trader.invoke({ request: "Buy 500 shares of Apple" }, rejectThread);
await trader.updateState(rejectThread, { status: "Cancelled by reviewer" }, "buy");
(await trader.getState(rejectThread)).values.status
// Expected: "Cancelled by reviewer", and buy never ran.`,
      md(
        "## Your turn",
        "",
        "1. Edit the order before approving it.",
        "2. If the smoke test said `interrupt()` works: rebuild `buy` with `interrupt()` inside it, as in *chatbot_with_hitl*.",
      ),
      code`
// TODO 1: on a new thread, after the pause, call
//   await trader.updateState(cfg, { order: { ...paused.values.order, quantity: 5 } });
// then invoke(null, cfg).
// Expected: "Bought 5 TSLA (simulated)".
`,
      code`
// TODO 2 (only if interrupt() works): const ok = interrupt("Buy " + s.order.quantity + " " + s.order.symbol + "?");
// Resume with: await trader2.invoke(new Command({ resume: "yes" }), cfg)
// Expected: "yes" buys, anything else cancels. Put a console.log before interrupt(): it prints twice,
// because a resumed node runs again from the top. Keep side effects after the interrupt.
`,
    ],
  },

  subgraphs: {
    title: "Subgraphs",
    cells: [
      md("# Subgraphs", "", howTo, "", credit("*15_subgraphs* and *15_subgraph_shared*")),
      code`
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";`,
      md(
        "## Different state: call the subgraph inside a node",
        "",
        "The subgraph has its own fields. A parent node maps state in and out. Pass `config` on, so streaming can see inside.",
      ),
      code`
const TranslateState = new StateSchema({ inputText: z.string(), translatedText: z.string().default("") });

const translator = new StateGraph(TranslateState)
  .addNode("translateText", async (s, config) => ({
    translatedText: (await model.invoke("Translate to Hindi. Reply with the translation only:\n" + s.inputText, config)).text,
  }))
  .addEdge(START, "translateText")
  .addEdge("translateText", END)
  .compile();

const Parent = new StateSchema({
  question: z.string(),
  answerEn: z.string().default(""),
  answerHi: z.string().default(""),
});

const mapped = new StateGraph(Parent)
  .addNode("answer", async (s, config) => ({
    answerEn: (await model.invoke("Answer in two sentences: " + s.question, config)).text,
  }))
  .addNode("translate", async (s, config) => ({
    answerHi: (await translator.invoke({ inputText: s.answerEn }, config)).translatedText,
  }))
  .addEdge(START, "answer")
  .addEdge("answer", "translate")
  .addEdge("translate", END)
  .compile();

await show(mapped);
await mapped.invoke({ question: "What is a vector database?" });`,
      md(
        "## Shared state: add the subgraph as a node",
        "",
        "When both use the same fields, the compiled subgraph **is** the node. `show(graph, { xray: true })` draws its inside.",
      ),
      code`
const Shared = new StateSchema({
  question: z.string(),
  answerEn: z.string().default(""),
  answerHi: z.string().default(""),
});

const sharedTranslator = new StateGraph(Shared)
  .addNode("translateText", async (s, config) => ({
    answerHi: (await model.invoke("Translate to Hindi. Reply with the translation only:\n" + s.answerEn, config)).text,
  }))
  .addEdge(START, "translateText")
  .addEdge("translateText", END)
  .compile();

const shared = new StateGraph(Shared)
  .addNode("answer", async (s, config) => ({
    answerEn: (await model.invoke("Answer in two sentences: " + s.question, config)).text,
  }))
  .addNode("translate", sharedTranslator)
  .addEdge(START, "answer")
  .addEdge("answer", "translate")
  .addEdge("translate", END)
  .compile();

await show(shared, { xray: true });`,
      code`
for await (const [namespace, update] of await shared.stream(
  { question: "What is LangGraph?" },
  { streamMode: "updates", subgraphs: true },
)) {
  console.log(namespace.length ? namespace.join(" > ") : "(parent)", Object.keys(update));
}
// Expected: (parent) answer, then a "translate:<id>" namespace with translateText, then (parent) translate.`,
      md(
        "## Your turn",
        "",
        "1. Compare `show(mapped, { xray: true })` with the shared one.",
        "2. Add a `summarise` subgraph before `translate` in the shared graph.",
      ),
      code`
// TODO 1: await show(mapped, { xray: true });
// Expected: "translate" stays one box, because the subgraph is called inside a function the drawing can't see into.
`,
      code`
// TODO 2: build a subgraph that shortens answerEn to one sentence and add it as a node.
// Expected: show(shared2, { xray: true }) draws answer -> summarise (inside: its node) -> translate.
`,
    ],
  },
};
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run src/infrastructure/notebook-runtime/templates.test.ts src/application/notebook-service.test.ts`
Expected: PASS (30 template tests + 6 service tests). A failing "compiles" test prints the template id and sucrase/acorn's message with line and column.

- [ ] **Step 5: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/notebook/templates.ts src/infrastructure/notebook-runtime/templates.test.ts
git commit -m "feat(notebook): add starter notebooks and exercises for the LangGraph week

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Kernel hook, code editor and outputs

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml` (add `@uiw/react-codemirror`, `@codemirror/lang-javascript`)
- Create: `src/components/notebook/use-kernel.ts`
- Create: `src/components/notebook/code-editor.tsx`
- Create: `src/components/notebook/cell-outputs.tsx`

**Interfaces:**

- Consumes: `KernelRequest`, `KernelEvent`, `CellOutput` (Task 1); the worker path (Task 5); `GraphView` from `@/components/learn/graph-view` (plan 1).
- Produces: `useKernel(): { run(source: string, onOutput: (o: CellOutput) => void): Promise<boolean>; restart(): void }`. `run` resolves `true` on success, `false` on error or when the kernel is restarted mid-run.
- Produces: `CodeEditor({ value, onChange, onRunAndNext, autoFocus, label })`, `CellOutputs({ outputs })`.

- [ ] **Step 1: Add the dependencies**

Run: `pnpm add @uiw/react-codemirror@4.25.12 @codemirror/lang-javascript@6.2.5`
Expected: both in `dependencies`. (`@uiw/react-codemirror` re-exports `@codemirror/state` and `@codemirror/view`, so `keymap`, `Prec` and `EditorView` come from it.)

- [ ] **Step 2: Write the kernel hook**

`src/components/notebook/use-kernel.ts`:

```ts
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { KernelEvent, KernelRequest } from "@/domain/notebook/kernel-protocol";
import type { CellOutput } from "@/domain/notebook/notebook";

interface Run {
  onOutput: (output: CellOutput) => void;
  resolve: (ok: boolean) => void;
  settled: boolean;
}

function settle(run: Run, ok: boolean) {
  if (run.settled) return;
  run.settled = true;
  run.resolve(ok);
}

/** One kernel (Web Worker) per open notebook. Restart = a fresh worker: every variable is gone. */
export function useKernel() {
  const worker = useRef<Worker | null>(null);
  const runs = useRef(new Map<number, Run>());
  const nextId = useRef(1);

  const restart = useCallback(() => {
    worker.current?.terminate();
    for (const run of runs.current.values()) settle(run, false);
    runs.current.clear();
    // A URL, not an import: the kernel lives in infrastructure/ (it imports @langchain/*).
    const w = new Worker(
      new URL("../../infrastructure/notebook-runtime/kernel.worker.ts", import.meta.url),
      { type: "module" },
    );
    w.onmessage = (e: MessageEvent<KernelEvent>) => {
      const run = runs.current.get(e.data.runId);
      if (!run) return;
      // Kept after "done": a late output (an un-awaited show()) still lands in its cell.
      if (e.data.type === "output") run.onOutput(e.data.output);
      else settle(run, e.data.ok);
    };
    w.onerror = (e) => {
      for (const run of runs.current.values()) {
        if (run.settled) continue;
        run.onOutput({ type: "error", text: e.message || "The kernel crashed. Restart it." });
        settle(run, false);
      }
    };
    worker.current = w;
  }, []);

  useEffect(() => {
    restart();
    return () => worker.current?.terminate();
  }, [restart]);

  const run = useCallback(
    (source: string, onOutput: (output: CellOutput) => void) =>
      new Promise<boolean>((resolve) => {
        const runId = nextId.current++;
        runs.current.set(runId, { onOutput, resolve, settled: false });
        const request: KernelRequest = { type: "run", runId, source };
        worker.current?.postMessage(request);
      }),
    [],
  );

  return useMemo(() => ({ run, restart }), [run, restart]);
}
```

- [ ] **Step 3: Write the code editor**

`src/components/notebook/code-editor.tsx`:

```tsx
"use client";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, { EditorView, keymap, Prec } from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Shift+Enter. */
  onRunAndNext: () => void;
  autoFocus?: boolean;
  label: string;
}

/** CodeMirror in TypeScript mode. Shift+Enter runs the cell (Jupyter's key). */
export function CodeEditor({ value, onChange, onRunAndNext, autoFocus, label }: Props) {
  // A ref, so the memoized keymap always calls the latest handler without rebuilding the editor.
  const run = useRef(onRunAndNext);
  useEffect(() => {
    run.current = onRunAndNext;
  });
  const extensions = useMemo(
    () => [
      javascript({ typescript: true }),
      EditorView.contentAttributes.of({ "aria-label": label }),
      Prec.highest(
        keymap.of([
          {
            key: "Shift-Enter",
            run: () => {
              run.current();
              return true;
            },
          },
        ]),
      ),
    ],
    [label],
  );
  const { resolvedTheme } = useTheme();

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      autoFocus={autoFocus}
      basicSetup={{ foldGutter: false, highlightActiveLine: false }}
      className="text-sm [&_.cm-editor]:bg-transparent [&_.cm-gutters]:bg-transparent"
    />
  );
}
```

- [ ] **Step 4: Write the outputs**

`src/components/notebook/cell-outputs.tsx`:

```tsx
import { GraphView } from "@/components/learn/graph-view";
import type { CellOutput } from "@/domain/notebook/notebook";
import { cn } from "@/lib/utils";

/** What a cell printed: text, errors in red, and graph drawings from show(). */
export function CellOutputs({ outputs }: { outputs: CellOutput[] }) {
  if (!outputs.length) return null;
  return (
    <div className="space-y-2 border-t px-3 py-2" aria-live="polite">
      {outputs.map((o, i) =>
        o.type === "graph" ? (
          <GraphView key={i} mermaid={o.text} />
        ) : (
          <pre
            key={i}
            className={cn(
              "overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre-wrap",
              o.type === "error" && "text-destructive",
            )}
          >
            {o.text}
          </pre>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/notebook
git commit -m "feat(notebook): add kernel hook, code editor and cell outputs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Notebook pages and editor

**Files:**

- Create: `src/components/notebook/notebook-cell.tsx`
- Create: `src/components/notebook/notebook-editor.tsx`
- Create: `src/app/admin/notebooks/page.tsx`
- Create: `src/app/admin/notebooks/[id]/page.tsx`
- Modify: `src/components/admin-nav.tsx`

**Interfaces:**

- Consumes: `useKernel`, `CodeEditor`, `CellOutputs` (Task 7); `saveNotebook`, `deleteNotebook`, `createNotebook` (Task 3); `appendOutput`, `Cell`, `Notebook` (Task 1); `TEMPLATES`, `TEMPLATE_IDS` (Task 6); existing `Markdown`, `ConfirmButton`, `PageHeader`, `NativeSelect`, `SubmitButton`, `Button`, `Input`, `Textarea`, `Table*`, `formatDate`.
- Produces: `/admin/notebooks`, `/admin/notebooks/[id]`, a "Notebooks" nav link.

- [ ] **Step 1: Write one cell**

`src/components/notebook/notebook-cell.tsx`:

```tsx
"use client";

import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Cell } from "@/domain/notebook/notebook";
import { CellOutputs } from "./cell-outputs";
import { CodeEditor } from "./code-editor";

interface Props {
  cell: Cell;
  index: number;
  count?: number;
  running: boolean;
  busy: boolean;
  autoFocus: boolean;
  onChange: (source: string) => void;
  onRun: () => void;
  onRunAndNext: () => void;
  onMove: (step: -1 | 1) => void;
  onDelete: () => void;
}

export function NotebookCell(p: Props) {
  const { cell } = p;
  const [editing, setEditing] = useState(cell.kind === "markdown" && cell.source === "");
  const label = `Cell ${p.index + 1} (${cell.kind})`;

  return (
    <section aria-label={label} className="rounded-xl border bg-card">
      <div className="flex items-center gap-1 border-b px-2 py-1 text-xs text-muted-foreground">
        <span className="w-12 font-mono" aria-live="polite">
          {cell.kind === "code" ? `[${p.running ? "*" : (p.count ?? " ")}]` : "text"}
        </span>
        {cell.kind === "code" ? (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Run cell"
            disabled={p.busy}
            onClick={p.onRun}
          >
            <PlayIcon aria-hidden />
          </Button>
        ) : (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Edit text"
            onClick={() => setEditing(true)}
          >
            <PencilIcon aria-hidden />
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="Move up" onClick={() => p.onMove(-1)}>
            <ArrowUpIcon aria-hidden />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Move down" onClick={() => p.onMove(1)}>
            <ArrowDownIcon aria-hidden />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Delete cell" onClick={p.onDelete}>
            <Trash2Icon aria-hidden />
          </Button>
        </div>
      </div>

      {cell.kind === "code" ? (
        <CodeEditor
          value={cell.source}
          onChange={p.onChange}
          onRunAndNext={p.onRunAndNext}
          autoFocus={p.autoFocus}
          label={label}
        />
      ) : editing ? (
        <Textarea
          aria-label={label}
          autoFocus
          value={cell.source}
          onChange={(e) => p.onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          className="min-h-24 rounded-none border-0 font-mono text-sm"
        />
      ) : (
        <div className="px-4 py-3" onDoubleClick={() => setEditing(true)}>
          <Markdown className="prose-sm">{cell.source || "_Empty text cell_"}</Markdown>
        </div>
      )}

      {cell.kind === "code" && <CellOutputs outputs={cell.output ?? []} />}
    </section>
  );
}
```

- [ ] **Step 2: Write the notebook editor**

`src/components/notebook/notebook-editor.tsx`:

```tsx
"use client";

import { PlayIcon, PlusIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteNotebook, saveNotebook } from "@/app/actions/notebooks";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  appendOutput,
  type Cell,
  type CellOutput,
  type Notebook,
} from "@/domain/notebook/notebook";
import { NotebookCell } from "./notebook-cell";
import { useKernel } from "./use-kernel";

type SaveStatus = "saved" | "saving" | "unsaved";

const newCell = (kind: Cell["kind"]): Cell => ({ id: crypto.randomUUID(), kind, source: "" });
const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved",
};

export function NotebookEditor({ notebook }: { notebook: Notebook }) {
  const [title, setTitle] = useState(notebook.title);
  const [cells, setCells] = useState(notebook.cells);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const kernel = useKernel();
  const cellsRef = useRef(cells);
  const runCount = useRef(0);
  const version = useRef(0);

  useEffect(() => {
    cellsRef.current = cells;
  }, [cells]);

  /** Every change goes through here, so autosave sees it. */
  const update = useCallback((fn: (cs: Cell[]) => Cell[]) => {
    setCells(fn);
    version.current++;
    setStatus("saving");
  }, []);

  // Autosave about 1s after the last change. A save that finishes after a newer change doesn't mark it saved.
  useEffect(() => {
    if (status !== "saving") return;
    const v = version.current;
    const timer = setTimeout(async () => {
      const r = await saveNotebook(notebook.id, { title, cells }).catch(() => null);
      if (version.current !== v) return;
      setStatus(r?.ok ? "saved" : "unsaved");
      if (!r?.ok)
        toast.error(`Couldn't save: ${r?.message ?? "network error"}. Your next edit retries.`);
    }, 1000);
    return () => clearTimeout(timer);
  }, [status, title, cells, notebook.id]);

  // Don't lose unsaved work by closing the tab.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const setOutputs = useCallback(
    (id: string, fn: (outputs: CellOutput[]) => CellOutput[]) =>
      update((cs) => cs.map((c) => (c.id === id ? { ...c, output: fn(c.output ?? []) } : c))),
    [update],
  );

  const runCell = useCallback(
    async (id: string): Promise<boolean> => {
      const cell = cellsRef.current.find((c) => c.id === id);
      if (!cell || cell.kind !== "code") return true;
      const n = ++runCount.current;
      setCounts((c) => ({ ...c, [id]: n }));
      setRunning(id);
      setOutputs(id, () => []);
      const ok = await kernel.run(cell.source, (out) =>
        setOutputs(id, (o) => appendOutput(o, out)),
      );
      setRunning((r) => (r === id ? null : r));
      return ok;
    },
    [kernel, setOutputs],
  );

  const runAll = async () => {
    for (const c of cellsRef.current) {
      if (c.kind === "code" && !(await runCell(c.id))) break;
    }
  };

  const runAndNext = (id: string) => {
    if (running) return;
    void runCell(id);
    const i = cellsRef.current.findIndex((c) => c.id === id);
    const next = cellsRef.current[i + 1];
    if (next) return setFocusId(next.id);
    const added = newCell("code");
    update((cs) => [...cs, added]);
    setFocusId(added.id);
  };

  const stop = () => {
    if (running) {
      setOutputs(running, (o) => [
        ...o,
        { type: "error", text: "Stopped. The kernel restarted, so earlier variables are gone." },
      ]);
    }
    kernel.restart();
    setRunning(null);
  };

  const restart = () => {
    kernel.restart();
    setRunning(null);
    setCounts({});
    runCount.current = 0;
    toast("Kernel restarted. Run the cells again to rebuild your variables.");
  };

  const insert = (index: number, kind: Cell["kind"]) => {
    const added = newCell(kind);
    update((cs) => [...cs.slice(0, index), added, ...cs.slice(index)]);
    setFocusId(added.id);
  };

  const move = (id: string, step: -1 | 1) =>
    update((cs) => {
      const i = cs.findIndex((c) => c.id === id);
      const j = i + step;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Notebook title"
          value={title}
          maxLength={120}
          onChange={(e) => {
            setTitle(e.target.value);
            version.current++;
            setStatus("saving");
          }}
          className="h-10 max-w-md text-lg font-semibold"
        />
        <span className="text-sm text-muted-foreground" role="status">
          {STATUS_TEXT[status]}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={runAll} disabled={running !== null}>
            <PlayIcon aria-hidden /> Run all
          </Button>
          <Button variant="outline" onClick={stop} disabled={running === null}>
            <SquareIcon aria-hidden /> Stop
          </Button>
          <Button variant="outline" onClick={restart}>
            <RotateCcwIcon aria-hidden /> Restart
          </Button>
          <ConfirmButton
            label="Delete"
            title="Delete this notebook?"
            description="Its cells and outputs are gone for good."
            onConfirm={async () => {
              const r = await deleteNotebook(notebook.id);
              if (r?.error) toast.error(r.error);
            }}
          />
        </div>
      </div>

      <ol className="space-y-3">
        {cells.map((cell, index) => (
          <li key={cell.id}>
            <NotebookCell
              cell={cell}
              index={index}
              count={counts[cell.id]}
              running={running === cell.id}
              busy={running !== null}
              autoFocus={focusId === cell.id}
              onChange={(source) =>
                update((cs) => cs.map((c) => (c.id === cell.id ? { ...c, source } : c)))
              }
              onRun={() => void runCell(cell.id)}
              onRunAndNext={() => runAndNext(cell.id)}
              onMove={(step) => move(cell.id, step)}
              onDelete={() => update((cs) => cs.filter((c) => c.id !== cell.id))}
            />
          </li>
        ))}
      </ol>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => insert(cells.length, "code")}>
          <PlusIcon aria-hidden /> Code
        </Button>
        <Button variant="outline" onClick={() => insert(cells.length, "markdown")}>
          <PlusIcon aria-hidden /> Text
        </Button>
      </div>
    </div>
  );
}
```

If `react-hooks` lint flags `setStatus` inside the title `onChange` or the autosave effect, keep the logic and move the title change into `update`-style helper `markDirty()` that does `version.current++; setStatus("saving")`, called from event handlers only.

- [ ] **Step 3: Write the pages**

`src/app/admin/notebooks/page.tsx`:

```tsx
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { createNotebook } from "@/app/actions/notebooks";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TEMPLATES, TEMPLATE_IDS } from "@/domain/notebook/templates";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Notebooks" };

export default async function NotebooksPage() {
  await requireAdminPage();
  const notebooks = await (await container.admin.notebooks()).list();
  const { timeZone } = container.config();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notebooks"
        description="Write LangGraph code, run it, keep it."
        actions={
          <form action={createNotebook} className="flex flex-wrap items-center gap-2">
            <NativeSelect name="template" aria-label="Start from" defaultValue="" className="w-64">
              <option value="">Blank notebook</option>
              {TEMPLATE_IDS.map((t) => (
                <option key={t} value={t}>
                  {TEMPLATES[t].title}
                </option>
              ))}
            </NativeSelect>
            <SubmitButton pendingText="Creating…">
              <PlusIcon aria-hidden /> New notebook
            </SubmitButton>
          </form>
        }
      />

      {notebooks.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Started from</TableHead>
              <TableHead>Last edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notebooks.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="py-3 whitespace-normal">
                  <Link
                    href={`/admin/notebooks/${n.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {n.title}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {n.template ? TEMPLATES[n.template].title : "Blank"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(n.updatedAt, timeZone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">
          No notebooks yet. Start a blank one or pick a lesson.
        </p>
      )}
    </div>
  );
}
```

`src/app/admin/notebooks/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { z } from "zod";
import { NotebookEditor } from "@/components/notebook/notebook-editor";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../../_lib/auth";

export const metadata = { title: "Notebook" };

export default async function NotebookPage({ params }: PageProps<"/admin/notebooks/[id]">) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const notebook = await (await container.admin.notebooks()).get(id);
  if (!notebook.ok) notFound();

  return <NotebookEditor notebook={notebook.value} />;
}
```

- [ ] **Step 4: Add the nav link**

In `src/components/admin-nav.tsx`: add `SquareCodeIcon` to the `lucide-react` import, add this entry after Notes in `LINKS`:

```ts
  { href: "/admin/notebooks", label: "Notebooks", icon: SquareCodeIcon },
```

and change the phone grid from `grid-cols-5` to `grid-cols-6`.

- [ ] **Step 5: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

- [ ] **Step 6: Smoke-test the worker under Turbopack**

Run `pnpm dev`, sign in, open `/admin/notebooks`, create a blank notebook, type `1 + 1` and press Shift+Enter.
Expected: `[1]` and output `2`. The browser console shows no "Failed to construct Worker". Then run `const x: number = 41;` in one cell and `x + 1` in the next: output `42`.

Run `pnpm build`.
Expected: the build succeeds and lists `/admin/notebooks` and `/admin/notebooks/[id]`. If the worker chunk fails to resolve `@langchain/langgraph/web` or `node:async_hooks`, stop and report the error (do not add webpack config).

- [ ] **Step 7: Commit**

```bash
git add src/components/notebook src/app/admin/notebooks src/components/admin-nav.tsx
git commit -m "feat(notebook): add notebook list and editor pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: "Practise this" on lesson playgrounds

**Files:**

- Modify: `src/components/focus/focus-sync.ts` (one exported function)
- Create: `src/components/notebook/practise-button.tsx`
- Modify: `src/components/learn/lesson-playground.tsx` (`LessonPlayground`)

**Interfaces:**

- Consumes: `createNotebook` (Task 3), `isTemplateId`, `TemplateId` (Task 1).
- Produces: `isAdminBrowser(): boolean`, `PractiseButton({ template: TemplateId })`.

- [ ] **Step 1: Expose the admin-browser flag**

Append to `src/components/focus/focus-sync.ts`:

```ts
/** True in browsers that have opened /admin (the same flag as focus sync). Only a hint: actions re-check. */
export function isAdminBrowser(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Write the button**

`src/components/notebook/practise-button.tsx`:

```tsx
"use client";

import { SquareCodeIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createNotebook } from "@/app/actions/notebooks";
import { isAdminBrowser } from "@/components/focus/focus-sync";
import { SubmitButton } from "@/components/submit-button";
import type { TemplateId } from "@/domain/notebook/templates";

const noSubscribe = () => () => {};

/**
 * Admin only: opens a new notebook made from this lesson's starter. The playground page is static,
 * so the browser flag decides whether to show it; createNotebook checks the real session.
 */
export function PractiseButton({ template }: { template: TemplateId }) {
  const admin = useSyncExternalStore(noSubscribe, isAdminBrowser, () => false);
  if (!admin) return null;
  return (
    <form action={createNotebook}>
      <input type="hidden" name="template" value={template} />
      <SubmitButton variant="outline" pendingText="Opening…">
        <SquareCodeIcon aria-hidden /> Practise this in a notebook
      </SubmitButton>
    </form>
  );
}
```

- [ ] **Step 3: Show it on the playground**

In `src/components/learn/lesson-playground.tsx`, add the imports

```ts
import { PractiseButton } from "@/components/notebook/practise-button";
import { isTemplateId } from "@/domain/notebook/templates";
```

and in `LessonPlayground`, right after `<Explainer title="Match it to the code">{lesson.match}</Explainer>`, add:

```tsx
{
  isTemplateId(id) && <PractiseButton template={id} />;
}
```

- [ ] **Step 4: Run the checks and look at it**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all PASS.

With `pnpm dev`: open `/admin` once, then a LangGraph lesson's `/blog/<slug>/playground`. Expected: "Practise this in a notebook" shows; clicking it opens a new notebook titled like the lesson. In a private window (no flag) the button does not show. LangChain lessons (`chain`, `route`, …) never show it.

- [ ] **Step 5: Commit**

```bash
git add src/components/focus/focus-sync.ts src/components/notebook/practise-button.tsx src/components/learn/lesson-playground.tsx
git commit -m "feat(notebook): open a lesson's starter notebook from its playground

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Docs

**Files:**

- Create: `docs/features/F14-practice-notebook.md`
- Modify: `docs/00-overview.md` (feature table row)
- Modify: `docs/02-decisions.md` (three rows)
- Modify: `docs/03-tech-debt.md` (Later list)
- Modify: `docs/architecture/database.md` (table + RLS rows)
- Modify: `docs/architecture/app-layer.md` (route map rows)
- Modify: `docs/architecture/testing.md` (new tests)

- [ ] **Step 1: Write the feature doc**

`docs/features/F14-practice-notebook.md`:

```markdown
# F14: Practice notebook · post-MVP

**Goal:** the admin practises LangGraph.js in a Jupyter-style notebook: write TypeScript cells, run them in the browser, see outputs and graph drawings, and find it all saved for revision.

**Stories:** from a LangGraph lesson's playground the admin clicks "Practise this", gets the lesson's starter notebook (warm-up, the lesson's graph in cells, "Your turn" exercises), runs it cell by cell, does the TODOs, and comes back next week to revise with the outputs still there.

**Files by layer:** domain `notebook/notebook.ts`, `notebook-repository.ts`, `kernel-protocol.ts`, `chat-proxy.ts`, `templates.ts` · application `NotebookService`, `NotebookModelService` · infra `repositories/supabase-notebook-repository.ts`, `ai/openai-proxy.ts`, `notebook-runtime/transform-cell.ts`, `notebook-runtime/kernel.worker.ts` · app `actions/notebooks.ts`, `admin/notebooks/page.tsx`, `admin/notebooks/[id]/page.tsx`, `api/learn/openai/v1/chat/completions/route.ts` · components `notebook/*` · migration `20261104090000_notebooks.sql`.

**Rules**

- Admin only: pages use `requireAdminPage()`, actions and the proxy route use `authorize()`, the table is admin-only under RLS.
- Code runs in a module Web Worker (the kernel). Restart = a new worker, so every variable is gone. Stop = restart while a cell runs.
- A cell's TypeScript types are stripped (sucrase), imports become lookups, top-level names are shared with later cells, and a final expression is printed.
- Allowed imports: `@langchain/langgraph` (browser build), `@langchain/langgraph/web`, `@langchain/langgraph/prebuilt`, `@langchain/openai`, `@langchain/core/messages`, `@langchain/core/prompts`, `@langchain/core/tools`, `zod`.
- Globals: `model` (gpt-4o-mini via the proxy) and `show(graph, { xray? })`.
- Model calls go to `POST /api/learn/openai/v1/chat/completions`: admin only, `gpt-4o-mini` only, at most 1000 tokens per call, `n` = 1. The server adds `OPENAI_API_KEY`; the browser never sees it. No daily budget.
- Limits: 200 cells, 50 000 characters per cell, 20 KB of output per cell (cut with a note). Autosave about 1s after the last change; "Unsaved" and a toast on failure.
- Browser limits: `interrupt()` may not work in the web build (the hitl starter checks and uses `interruptBefore`); no outside HTTP APIs; `MemorySaver` only.
- Starters: one per LangGraph lesson (`lg-*`) plus `tools`, `memory`, `hitl`, `subgraphs`, adapted from the Python langgraph-tutorials repo. They use the lessons' state API: `StateSchema` + Zod, `ReducedValue`, `MessagesValue`.

**Done when**

- [ ] Notebook domain, service, proxy, transform and starters are unit-tested; the repository passes `pnpm test:db`.
- [ ] Every starter runs in the browser (checked locally).
- [ ] Stop on `while (true) {}`, Restart clears variables, `show(graph)` draws, reload shows saved outputs.
- [ ] A signed-out call to the proxy gets 401.
```

- [ ] **Step 2: Update the shared docs**

- `docs/00-overview.md`, feature table: add after F13:
  `| [F14](features/F14-practice-notebook.md) | Practice notebook: LangGraph cells in the browser | post-MVP | ⬜ |`
- `docs/02-decisions.md`, decisions table: add three rows:
  - `| The notebook runs code in a browser Web Worker, not on the server | Free, no server risk, and a bad loop only hangs the admin's own tab (Stop kills the worker). The cost: no Node-only APIs and only pre-bundled packages. |`
  - `| The kernel worker lives in src/infrastructure/notebook-runtime/ although it runs in the browser | Only infrastructure/ may import @langchain/*. The UI starts it with new Worker(new URL(...)), which is not an import, so the layer rule is unchanged. Shared worker ↔ UI types live in domain/notebook/. |`
  - `| Notebook model calls go through an admin-only route that adds the OpenAI key | Hard rule 6: no secrets on the client. The route allows gpt-4o-mini only with max 1000 tokens and n = 1, so a typo can't run up a bill. |`
- `docs/03-tech-debt.md`, "Future features": replace the Learn line with:
  `- Learn platform: learner sign-in and per-user notebooks · a per-user model budget or bring-your-own key · exercises with automatic checks · progress tracking · Python via a paid sandbox (E2B / Vercel Sandbox) · TypeScript IntelliSense in the editor (Monaco + LangGraph types) · an /embeddings route for RAG starters · an MCP bridge · real search/stock tools through a server-side tool proxy · a Supabase checkpointer · framework packs (CrewAI, Mastra) on the same notebook.`
- `docs/architecture/database.md`: add a table row `| notebooks | id, title (1–120), template?, cells **jsonb** (Cell[]; shape checked by Zod on write and read), created_at, updated_at ([F14](../features/F14-practice-notebook.md)) |`, add `notebooks` to the `updated_at` trigger list and an index note `notebooks(updated_at desc)`, and an RLS row `| notebooks | none | all |`.
- `docs/architecture/app-layer.md`, route map: add `| /api/learn/openai/v1/chat/completions | admin (checked in the route; src/proxy.ts doesn't match /api) | dynamic |`.
- `docs/architecture/testing.md`: under "Integration tests against local Supabase" add `- notebook-repository.test.ts: notebooks through RLS as an admin and a non-admin.`; under "Fakes" add `InMemoryNotebookRepository` to the `in-memory-store.ts` row.

- [ ] **Step 3: Format and commit**

Run: `pnpm format && pnpm lint`
Expected: PASS.

```bash
git add docs
git commit -m "docs: add practice notebook feature doc and decisions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verify end to end

**Files:** none changed unless a check fails (fix in the owning task's files, then re-run).

- [ ] **Step 1: Automated checks**

Run:

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:db
pnpm build
```

Expected: all PASS; the build lists `/admin/notebooks`, `/admin/notebooks/[id]` and `/api/learn/openai/v1/chat/completions`.

- [ ] **Step 2: Browser checklist (`pnpm dev`, signed in as admin, `OPENAI_API_KEY` set)**

For each starter in the "New notebook" picker, create it and press **Run all**:

| Starter           | Expected                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| LangGraph 1       | BMI 26.73 "Overweight", two graphs drawn, a moon answer                                                                                  |
| LangGraph 2       | A 3-bullet outline and a tweet, or a stop at the gate                                                                                    |
| LangGraph 3       | Three quadratic results; route "billing" for the double charge                                                                           |
| LangGraph 4       | "SR 200 \| balls per boundary 5 \| boundary% 48"; a review report; the essay cell shows InvalidUpdateError (expected, it's the exercise) |
| LangGraph 5       | 2–3 workers, one combined answer; the drawing shows plan → work → synthesize                                                             |
| LangGraph 6       | 1–3 rounds and a final tagline                                                                                                           |
| Tools             | Message trace ends with an answer of 11375                                                                                               |
| Memory            | Thread 1 knows "Asha", thread 2 doesn't; a samosa joke; crash then resume without "step 1 ran" twice                                     |
| Human in the loop | Smoke cell says whether `interrupt()` works (record the answer in F14); trade-1 bought 10 TSLA; trade-2 cancelled                        |
| Subgraphs         | A Hindi answer; the xray drawing shows `translateText` inside `translate`; streamed namespaces printed                                   |

Then:

- [ ] A cell with `while (true) {}`: **Stop** becomes active; pressing it shows "Stopped. The kernel restarted…" within a second, and the tab stays responsive.
- [ ] **Restart**, then run a cell that uses a name from an earlier cell: `ReferenceError`.
- [ ] Edit a cell, wait for "Saved", reload the page: the edit and the last outputs (including a graph) are still there.
- [ ] `import fs from "fs"` in a cell: "`fs` isn't available in the notebook. Available: …".
- [ ] Signed out (private window), `curl` the proxy as in Task 4 Step 9: `401`.
- [ ] Signed in, run `import { ChatOpenAI } from "@langchain/openai";` then `await new ChatOpenAI({ model: "gpt-4o", apiKey: "x", configuration: { baseURL: location.origin + "/api/learn/openai/v1" } }).invoke("hi")`: the error says "Only gpt-4o-mini is allowed in the notebook".
- [ ] Light and dark mode: editor, outputs and graphs are readable.
- [ ] Phone width (375px): the toolbar wraps, cells don't scroll the page sideways.

- [ ] **Step 3: Close out**

Tick F14's "Done when" boxes that passed, set the overview row to ✅ when all pass, record the `interrupt()` smoke result in F14's Rules, and commit:

```bash
git add docs/features/F14-practice-notebook.md docs/00-overview.md
git commit -m "docs: mark practice notebook done

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
