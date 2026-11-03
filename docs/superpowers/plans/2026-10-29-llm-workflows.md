# LLM workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LangChain lessons 2–6 (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer), each a post with its own runnable playground.

**Architecture:** One `IWorkflowRunner` port in the domain, one LangChain implementation with five plain async workflows, one `LearnService.runWorkflow` behind the existing rate limit, one server action, and one shared client flow view that draws any run from its steps. The lesson registry (`LESSONS`) gets five more entries.

**Tech Stack:** Next.js 16, `@langchain/core` + `@langchain/openai` (installed), Zod, Vitest.

**Spec:** [2026-10-29-llm-workflows-design.md](../specs/2026-10-29-llm-workflows-design.md)

## Global Constraints

- Model `gpt-4o-mini`, `maxTokens` 200, `timeout` 15 000 ms, `maxRetries` 0.
- Input 1–200 characters after trim. Honeypot field `website`.
- Rate limit is the existing `RateLimiter(5, 60_000)` shared with lesson 1.
- Only `src/infrastructure/**` imports `@langchain/*`.
- Provider error text stays in the server log.
- Playground ids: `chain`, `route`, `parallel`, `orchestrate`, `evaluate`.

---

### Task 1: Domain port and service method

**Files:** create `src/domain/learn/workflow.ts`, `test/fakes/fake-workflow-runner.ts` · modify `src/application/learn-service.ts`, `src/application/learn-service.test.ts`

**Produces:**

```ts
export const WORKFLOW_IDS = ["chain", "route", "parallel", "orchestrate", "evaluate"] as const;
export type WorkflowId = (typeof WORKFLOW_IDS)[number];
export interface WorkflowStep {
  lane: number; // steps in one lane ran at the same time; lanes run in order
  label: string;
  kind: "llm" | "code";
  messages: SentMessage[];
  output: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}
export interface WorkflowRun {
  steps: WorkflowStep[];
  output: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}
export interface IWorkflowRunner {
  run(id: WorkflowId, input: string): Promise<Result<WorkflowRun, GenerationError>>;
}
// application
export const workflowSchema: z.ZodObject<{ id; input; website }>;
LearnService(greeter, workflows: IWorkflowRunner, limiter).runWorkflow(clientKey, input);
```

- [ ] Tests first: `workflowSchema` (trim, 1–200, unknown id rejected); `runWorkflow` passes id + input, returns runner error, blocks over the limit, ignores honeypot bots.
- [ ] Run `pnpm vitest run src/application/learn-service.test.ts` → fails.
- [ ] Implement, sharing one private guard between `greet` and `runWorkflow`. Update the container's constructor call.
- [ ] Tests pass.

### Task 2: The five LangChain workflows

**Files:** create `src/infrastructure/ai/langchain-workflows.ts`, `src/infrastructure/ai/langchain-workflows.test.ts` · modify `src/infrastructure/ai/error-mapping.ts` (shared public-safe message), `src/infrastructure/ai/langchain-greeter.ts` (use it), `src/lib/container.ts`

**Consumes:** Task 1 types. **Produces:** `LangChainWorkflows implements IWorkflowRunner`, `WORKFLOW_MODEL`.

- [ ] Tests first, with `ChatOpenAI` mocked as a `RunnableLambda` that answers by system prompt:
  - chain: lanes outline → gate → tweet; a 2-bullet outline stops at the gate (no tweet call, run still ok).
  - route: classify → route → specialist; reply "Billing." routes to billing; "weather" → `invalid_output`.
  - parallel: three steps in lane 0, join in lane 1.
  - orchestrate: planner lines → at most 3 workers in lane 1 → synthesizer; empty plan → `invalid_output`.
  - evaluate: stops on PASS; stops after 3 FAIL rounds with a code step; unreadable grade → `invalid_output`.
  - usage sums over LLM steps; missing key → `provider` with no call; 429 → `rate_limit` without provider text.
- [ ] Run → fails. Implement. Run → passes.

### Task 3: Action, playground UI, lesson registry

**Files:** modify `src/app/actions/learn.ts`, `src/components/learn/lesson-playground.tsx` (export `Lesson`, spread `WORKFLOW_LESSONS`, generic CTA copy) · create `src/components/learn/workflow-playground.tsx`, `src/components/learn/workflow-lessons.tsx`

- [ ] `runWorkflow(_, formData)`: Zod-parse → IP → `learn().runWorkflow` → `{ ok, run, values: { input } }`.
- [ ] `WorkflowPlayground({ id, field, shape })`: one input + hidden `id` + honeypot. The flow shows `shape` (lane labels) before a run, the real steps after. Parallel steps sit side by side from `sm` up. Each step shows output, tokens and time, with "Sent to the model" folded away.
- [ ] `workflow-lessons.tsx`: teaching code, "Match it to the code" and "Watch it run" for all five.
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass.

### Task 4: Lesson posts

**Files:** create `docs/lessons/02-prompt-chaining.md` … `06-evaluator-optimizer.md`

- [ ] Follow `docs/add-blog.md`: header comment, idea in one line, analogy, `concepts`, when to use / not, where people get stuck, say it back, what's next, `playground` block with the id.
- [ ] `pnpm format`.

### Task 5: Verify and document

- [ ] Run each playground locally (needs `OPENAI_API_KEY` in `.env.local` and the five notes created locally).
- [ ] F11 lists the new playgrounds. Spec "Done when" is ticked.
