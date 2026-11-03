# LangGraph series + graph view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LangGraph lessons 1–6 (a simple LLM call, then the five workflows built as graphs), each a post with a runnable playground that also draws the graph and lights up the nodes that ran.

**Architecture:** A second `IWorkflowRunner`, `LangGraphWorkflows`, runs six `StateGraph`s on the server. It reuses the prompts, caps, `ask()` helper and error handling of `LangChainWorkflows`, so the only new idea per lesson is the graph. Each run streams `updates` (which node ran) and `values` (final state), and returns the steps for the existing flow view plus `graph: { mermaid, ran }`. `LearnService` sends `lg-*` ids to the new runner. A client `GraphView` renders the Mermaid text.

**Tech Stack:** Next.js 16, `@langchain/langgraph` 1.6.0 (new), `mermaid` 12.2.0 (new), `@langchain/core` 1.3 + `@langchain/openai` 1.7 (installed), Zod 4, Vitest.

**Spec:** [2026-11-03-langgraph-notebook-design.md](../specs/2026-11-03-langgraph-notebook-design.md), parts 1 and 2. Part 3 (notebook) has its own plan.

**References:** the Python tutorials in `/Users/devsakar/Desktop/Learn/langgraph/langgraph-tutorials/` (`1_bmi`, `2_simple_llm`, `3_prompt_chaining`, `4_batsman`, `5_UPSC_essay`, `6_quadratic`, `7_review_reply`, `8_X_post_generator`). Read them for the pattern; write our own text and code. None covers orchestrator-workers; use the LangGraph `Send` docs.

## Global Constraints

- Model `gpt-4o-mini`, `maxTokens` 200, `timeout` 15 000 ms, `maxRetries` 0. Same prompts as the LangChain lessons.
- `MAX_WORKERS = 3`, `MAX_ROUNDS = 3`. A bad route, plan or grade → `invalid_output` "The model gave an answer we couldn't read. Try again." A gate stop or hitting the round cap is **not** an error.
- Input 1–200 characters after trim. Honeypot field `website`. Rate limit: the existing `RateLimiter(5, 60_000)`, shared by every lesson.
- Only `src/infrastructure/**` imports `@langchain/*` (ESLint enforces it).
- State API: `StateSchema` + `ReducedValue` with Zod. Not `Annotation.Root`.
- Build graphs by **chaining** `new StateGraph(S).addNode(...).addEdge(...)`; separate statements lose the node-name types.
- Every `addConditionalEdges` passes a path list (e.g. `["writeTweet", END]`), so the drawing shows every branch.
- A node name must never equal a state key (LangGraph.js throws). Nodes are verbs (`writeOutline`), keys are nouns (`outline`).
- Drawing: `(await graph.getGraphAsync()).drawMermaid()`. `getGraph()` is deprecated.
- Graph lesson ids: `lg-greet`, `lg-chain`, `lg-route`, `lg-parallel`, `lg-orchestrate`, `lg-evaluate`. Lesson topic: "LangGraph".
- Provider error text stays in the server log. No `any`.
- Checks after every task: `pnpm lint && pnpm typecheck && pnpm test`.

---

### Task 1: Graph ids in the domain, shared runner core

Widens the id type and pulls the parts both runners need out of `langchain-workflows.ts`. No behaviour change: the existing tests must still pass.

**Files:**

- Modify: `src/domain/learn/workflow.ts`
- Modify: `src/infrastructure/ai/langchain-workflows.ts`
- Modify: `src/application/learn-service.ts` (types only)
- Modify: `src/components/learn/workflow-lessons.tsx`
- Modify: `test/fakes/fake-workflow-runner.ts` (no change needed if it compiles; check)

**Interfaces:**

- Produces (domain): `WORKFLOW_IDS`, `GRAPH_IDS`, `type PlainWorkflowId`, `type GraphId`, `type WorkflowId = PlainWorkflowId | GraphId`, `isGraphId(id): id is GraphId`, `WorkflowRun.graph?: { mermaid: string; ran: string[] }`, `IWorkflowRunner<Id extends WorkflowId = WorkflowId>`.
- Produces (infra, exported from `langchain-workflows.ts`): `WORKFLOW_MODEL`, `NOT_SWITCHED_ON`, `PROMPTS`, `ROUTES`, `HANDLERS`, `MAX_WORKERS`, `MAX_ROUNDS`, `class UnreadableOutput`, `interface Flow`, `ask(model, lane, label, system, input)`, `code(lane, label, output)`, `bullets(text)`, `readGrade(text)`, `workflowModel(apiKey)`, `finishRun(id, flow)`.
- Produces (components, exported from `workflow-lessons.tsx`): `C`, `llm`, `code`, `type Playground`, `lessonWith(prelude)`.

- [ ] **Step 1: Widen the domain ids and add the graph field**

Replace the top of `src/domain/learn/workflow.ts` (the `WORKFLOW_IDS` / `WorkflowId` lines) and the bottom (`WorkflowRun`, `IWorkflowRunner`) so the file reads:

```ts
import type { GenerationError } from "@/domain/shared/errors";
import type { Result } from "@/domain/shared/result";
import type { SentMessage } from "./greeter";

/** The five LangChain workflow lessons, by playground id. */
export const WORKFLOW_IDS = ["chain", "route", "parallel", "orchestrate", "evaluate"] as const;
/** The six LangGraph lessons: a simple call, then the same five workflows as graphs. */
export const GRAPH_IDS = [
  "lg-greet",
  "lg-chain",
  "lg-route",
  "lg-parallel",
  "lg-orchestrate",
  "lg-evaluate",
] as const;
export type PlainWorkflowId = (typeof WORKFLOW_IDS)[number];
export type GraphId = (typeof GRAPH_IDS)[number];
export type WorkflowId = PlainWorkflowId | GraphId;

export const isGraphId = (id: WorkflowId): id is GraphId =>
  (GRAPH_IDS as readonly WorkflowId[]).includes(id);

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** One box in the playground flow: a model call, or a step done in plain code. */
export interface WorkflowStep {
  /** Steps in the same lane ran at the same time. Lanes run in order, from 0. */
  lane: number;
  label: string;
  kind: "llm" | "code";
  /** What the model was sent. Empty for code steps. */
  messages: SentMessage[];
  output: string;
  usage: TokenUsage;
  latencyMs: number;
}

export interface WorkflowRun {
  steps: WorkflowStep[];
  /** The workflow's final answer. */
  output: string;
  model: string;
  /** Summed over every model call. */
  usage: TokenUsage;
  latencyMs: number;
  /** LangGraph lessons only: the graph as Mermaid text, and its nodes in the order they ran. */
  graph?: { mermaid: string; ran: string[] };
}

/** Runs one workflow lesson end to end with real model calls. */
export interface IWorkflowRunner<Id extends WorkflowId = WorkflowId> {
  run(id: Id, input: string): Promise<Result<WorkflowRun, GenerationError>>;
}
```

- [ ] **Step 2: Run typecheck to see what the wider id breaks**

Run: `pnpm typecheck`
Expected: FAIL in `langchain-workflows.ts` (`WORKFLOWS` is missing the `lg-*` keys) and `workflow-lessons.tsx` (`Record<WorkflowId, Lesson>`).

- [ ] **Step 3: Pull shared pieces out of `langchain-workflows.ts`**

In `src/infrastructure/ai/langchain-workflows.ts`:

1. Change the domain import to:

```ts
import type {
  IWorkflowRunner,
  PlainWorkflowId,
  WorkflowId,
  WorkflowRun,
  WorkflowStep,
} from "@/domain/learn/workflow";
```

2. Replace everything from `export const WORKFLOW_MODEL` down to (not including) `/** One model call` with:

```ts
// The LLM workflow lessons (docs/lessons/02-06) teach the code in this file. The LangGraph
// lessons (langgraph-workflows.ts) reuse its prompts, caps and helpers.
export const WORKFLOW_MODEL = "gpt-4o-mini";
export const NOT_SWITCHED_ON = "This demo isn't switched on yet. Check back soon.";

/** The system prompts, shared with the LangGraph versions so only the wiring differs. */
export const PROMPTS = {
  outline:
    'Write an outline for a short post on the user\'s topic. Reply with exactly 3 lines, each starting with "- ". No other text.',
  tweet:
    "Turn these bullet points into one tweet under 280 characters. No hashtags. Reply with the tweet only.",
  classify: "Classify the customer message. Reply with one word: billing, technical or general.",
  sentiment: "Read the product review. Reply with one word: positive, negative or mixed.",
  summary: "Summarise the product review in one sentence.",
  keyPoints:
    'List the review\'s key points: at most 3 lines, each starting with "- ". No other text.',
  plan: 'You plan work. Break the user\'s goal into 2 or 3 independent subtasks. Reply with one subtask per line, each starting with "- ". No other text.',
  worker:
    "You are a worker. Do only the subtask you are given, for the goal you are given, in 2 or 3 sentences.",
  synthesize: "Combine the results below into one short, clear answer to the goal.",
  write:
    "Write one tagline, under 12 words, for the product idea. If you get feedback on an earlier tagline, fix what it points out. Reply with the tagline only.",
  grade:
    'You grade product taglines. Pass only if it names what makes this product different and is free of cliches. Reply "PASS", or "FAIL: " followed by one sentence of feedback.',
} as const;

/** The model gave an answer the next step can't use. */
export class UnreadableOutput extends Error {}

interface Asked {
  text: string;
  step: WorkflowStep;
}
export interface Flow {
  steps: WorkflowStep[];
  output: string;
  graph?: WorkflowRun["graph"];
}
```

3. Add `export` to `ask`, `code`, `bullets`, `ROUTES`, `HANDLERS`, `MAX_WORKERS`, `MAX_ROUNDS` and `readGrade` (signatures unchanged).

4. In the five workflow functions, replace each inline system string with its `PROMPTS` entry. The strings are moved, not changed:

| Function              | Call                           | Use                  |
| --------------------- | ------------------------------ | -------------------- |
| `promptChaining`      | `"outline"`                    | `PROMPTS.outline`    |
| `promptChaining`      | `"tweet"`                      | `PROMPTS.tweet`      |
| `routing`             | `"classifier"`                 | `PROMPTS.classify`   |
| `parallelization`     | `"sentiment"`                  | `PROMPTS.sentiment`  |
| `parallelization`     | `"summary"`                    | `PROMPTS.summary`    |
| `parallelization`     | `"key points"`                 | `PROMPTS.keyPoints`  |
| `orchestratorWorkers` | `"orchestrator"`               | `PROMPTS.plan`       |
| `orchestratorWorkers` | `` `worker ${i + 1}` ``        | `PROMPTS.worker`     |
| `orchestratorWorkers` | `"synthesizer"`                | `PROMPTS.synthesize` |
| `evaluatorOptimizer`  | `` `writer, round ${round}` `` | `PROMPTS.write`      |
| `evaluatorOptimizer`  | `` `grader, round ${round}` `` | `PROMPTS.grade`      |

5. Replace everything from `const WORKFLOWS` to the end of the file with:

```ts
const WORKFLOWS: Record<PlainWorkflowId, (model: ChatOpenAI, input: string) => Promise<Flow>> = {
  chain: promptChaining,
  route: routing,
  parallel: parallelization,
  orchestrate: orchestratorWorkers,
  evaluate: evaluatorOptimizer,
};

export const workflowModel = (apiKey: string) =>
  new ChatOpenAI({ model: WORKFLOW_MODEL, apiKey, maxTokens: 200, timeout: 15_000, maxRetries: 0 });

/** Times a flow, sums its tokens, and turns failures into errors the page can show. */
export async function finishRun(
  id: WorkflowId,
  flow: () => Promise<Flow>,
): Promise<Result<WorkflowRun, GenerationError>> {
  const started = Date.now();
  try {
    const { steps, output, graph } = await flow();
    const usage = { inputTokens: 0, outputTokens: 0 };
    for (const step of steps) {
      usage.inputTokens += step.usage.inputTokens;
      usage.outputTokens += step.usage.outputTokens;
    }
    return ok({
      steps,
      output,
      model: WORKFLOW_MODEL,
      usage,
      latencyMs: Date.now() - started,
      ...(graph && { graph }),
    });
  } catch (error) {
    if (error instanceof UnreadableOutput) {
      console.error(`[ai] workflow ${id} invalid_output`, { error });
      return err(
        new GenerationError(
          "invalid_output",
          "The model gave an answer we couldn't read. Try again.",
        ),
      );
    }
    return err(toPublicGenerationError(error, `workflow ${id}`, { model: WORKFLOW_MODEL }));
  }
}

export class LangChainWorkflows implements IWorkflowRunner<PlainWorkflowId> {
  private model: ChatOpenAI | undefined;

  constructor(private readonly apiKey: string | undefined) {}

  async run(id: PlainWorkflowId, input: string): Promise<Result<WorkflowRun, GenerationError>> {
    if (!this.apiKey) return err(new GenerationError("provider", NOT_SWITCHED_ON));
    const model = (this.model ??= workflowModel(this.apiKey));
    return finishRun(id, () => WORKFLOWS[id](model, input));
  }
}
```

- [ ] **Step 4: Narrow the service's runner type**

In `src/application/learn-service.ts`, change the import and the constructor's second parameter only:

```ts
import {
  WORKFLOW_IDS,
  type IWorkflowRunner,
  type PlainWorkflowId,
  type WorkflowRun,
} from "@/domain/learn/workflow";
```

```ts
    private readonly workflows: IWorkflowRunner<PlainWorkflowId>,
```

`workflowSchema` still uses `z.enum(WORKFLOW_IDS)`, so `input.id` is a `PlainWorkflowId`. Task 3 widens it.

- [ ] **Step 5: Make the lesson builder reusable and narrow `WORKFLOW_LESSONS`**

In `src/components/learn/workflow-lessons.tsx`:

1. Import type: `import type { PlainWorkflowId, WorkflowId } from "@/domain/learn/workflow";`
2. Export `C`, `llm`, `code` and `Playground`: add `export` before `const C`, `const llm`, `const code` and `type Playground`.
3. Replace the `const lesson = (...) => [...]` block with:

```ts
/** Builds a lesson entry. `prelude` opens the "Match it to the code" list (e.g. what `ask` is). */
export const lessonWith =
  (prelude: React.ReactNode) =>
  <Id extends WorkflowId>(
    id: Id,
    file: string,
    src: string,
    playground: Playground,
    match: React.ReactNode,
    run: React.ReactNode,
  ): [Id, Lesson] => [
    id,
    {
      file,
      code: src,
      Flow: () => <WorkflowPlayground id={id} {...playground} />,
      match: (
        <>
          <p>Read the code on the left from top to bottom:</p>
          <ol>
            {prelude}
            {match}
          </ol>
        </>
      ),
      run,
    },
  ];

const lesson = lessonWith(ASK_MATCH);
```

4. Change both `Record<WorkflowId, Lesson>` (the declared type and the trailing `as`) to `Record<PlainWorkflowId, Lesson>`.

- [ ] **Step 6: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS. `langchain-workflows.test.ts` passes unchanged, because the prompts are the same strings.

- [ ] **Step 7: Commit**

```bash
git add src/domain/learn/workflow.ts src/infrastructure/ai/langchain-workflows.ts src/application/learn-service.ts src/components/learn/workflow-lessons.tsx
git commit -m "refactor(learn): graph lesson ids and a shared workflow runner core"
```

---

### Task 2: `LangGraphWorkflows`: the six graphs

**Files:**

- Create: `src/infrastructure/ai/langgraph-workflows.ts`
- Create: `src/infrastructure/ai/langgraph-workflows.test.ts`
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm add`)

**Interfaces:**

- Consumes: everything Task 1 exports from `langchain-workflows.ts`; `GraphId`, `IWorkflowRunner`, `WorkflowRun`, `WorkflowStep` from the domain.
- Produces: `class LangGraphWorkflows implements IWorkflowRunner<GraphId>` with `constructor(apiKey: string | undefined)` and `run(id: GraphId, input: string): Promise<Result<WorkflowRun, GenerationError>>`. Each run's `graph.ran` lists node names in the order their `updates` arrived (a `Send` node appears once per worker). Step labels are node names, except `worker N` and `write, round N` / `grade, round N`.

Graph shapes (node names; state keys never reuse them):

| Id               | Graph                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| `lg-greet`       | START → `greet` → END                                                  |
| `lg-chain`       | START → `writeOutline` -?-> `writeTweet` → END, or END (the gate)      |
| `lg-route`       | START → `classify` -?-> `billing` / `technical` / `general` → END      |
| `lg-parallel`    | START → `rateSentiment`, `summarise`, `listKeyPoints` → `join` → END   |
| `lg-orchestrate` | START → `plan` -Send-> `worker` ×2–3 → `synthesize` → END              |
| `lg-evaluate`    | START → `write` → `grade` -?-> END, or back to `write` (cap: 3 rounds) |

- [ ] **Step 1: Install LangGraph**

Run: `pnpm add @langchain/langgraph@1.6.0`
Expected: added. Peers `@langchain/core ^1.1.48` and `zod ^4.2.0` are satisfied.

- [ ] **Step 2: Write the failing tests**

Create `src/infrastructure/ai/langgraph-workflows.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { GRAPH_IDS, type GraphId } from "@/domain/learn/workflow";

// Stand-in for ChatOpenAI, as in langchain-workflows.test.ts: answers with `reply(system, user)`.
type Reply = (system: string, user: string) => string;
let reply: Reply = () => "";
let failWith: unknown;
const calls: string[] = [];
vi.mock("@langchain/openai", async () => {
  const { RunnableLambda } = await import("@langchain/core/runnables");
  const { AIMessage } = await import("@langchain/core/messages");
  type Sent = { text: string }[];
  return {
    ChatOpenAI: class extends RunnableLambda<Sent, InstanceType<typeof AIMessage>> {
      constructor() {
        super({
          func: async (messages: Sent) => {
            const [system = "", user = ""] = messages.map((m) => m.text);
            calls.push(system);
            if (failWith) throw failWith;
            return new AIMessage({
              content: reply(system, user),
              usage_metadata: { input_tokens: 20, output_tokens: 5, total_tokens: 25 },
            });
          },
        });
      }
    },
  };
});

const { LangGraphWorkflows } = await import("./langgraph-workflows");

const run = async (id: GraphId, input: string) => {
  const result = await new LangGraphWorkflows("sk-test").run(id, input);
  if (!result.ok) throw result.error;
  return result.value;
};
const runError = async (id: GraphId, input: string) => {
  const result = await new LangGraphWorkflows("sk-test").run(id, input);
  if (result.ok) throw new Error("expected a failure");
  return result.error;
};
const shape = (steps: { lane: number; label: string }[]) =>
  steps.map((s) => `${s.lane}:${s.label}`);
/** Picks a reply by a word the step's system prompt contains. */
const by =
  (answers: Record<string, string>): Reply =>
  (system) =>
    Object.entries(answers).find(([word]) => system.includes(word))?.[1] ?? "";
/** A reply that lets every graph run to the end. */
const happy: Reply = (system) =>
  system.includes("outline")
    ? "- a\n- b\n- c"
    : system.includes("Classify")
      ? "general"
      : system.includes("plan work")
        ? "- a\n- b"
        : system.includes("grade")
          ? "PASS"
          : "ok";

describe("LangGraphWorkflows", () => {
  afterEach(() => {
    reply = () => "";
    failWith = undefined;
    calls.length = 0;
    vi.restoreAllMocks();
  });

  it.each(GRAPH_IDS)("%s compiles, runs and draws itself from START to END", async (id) => {
    reply = happy;
    const result = await run(id, "something");
    expect(result.graph?.mermaid).toContain("__start__");
    expect(result.graph?.mermaid).toContain("__end__");
    expect(result.graph?.ran.length).toBeGreaterThan(0);
  });

  it("lg-greet: one node, one call", async () => {
    reply = () => "Hello, Sam!";
    const result = await run("lg-greet", "Sam");
    expect(shape(result.steps)).toEqual(["0:greet"]);
    expect(result.steps[0]?.messages[1]?.content).toBe("Hi, my name is Sam.");
    expect(result.graph?.ran).toEqual(["greet"]);
    expect(result.output).toBe("Hello, Sam!");
  });

  describe("lg-chain", () => {
    it("writes the outline, passes the gate, then writes the tweet from the outline", async () => {
      let tweetInput = "";
      reply = (system, user) => {
        if (system.includes("outline")) return "- one\n- two\n- three";
        tweetInput = user;
        return "A tweet.";
      };
      const result = await run("lg-chain", "RAG");
      expect(shape(result.steps)).toEqual(["0:writeOutline", "1:writeTweet"]);
      expect(result.graph?.ran).toEqual(["writeOutline", "writeTweet"]);
      expect(tweetInput).toBe("- one\n- two\n- three");
      expect(result.output).toBe("A tweet.");
      expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 10 });
    });

    it("stops at the gate (a conditional edge to END) without another call", async () => {
      reply = () => "- one\n- two";
      const result = await run("lg-chain", "RAG");
      expect(shape(result.steps)).toEqual(["0:writeOutline"]);
      expect(result.graph?.ran).toEqual(["writeOutline"]);
      expect(result.output).toMatch(/got 2/);
      expect(calls).toHaveLength(1);
    });
  });

  describe("lg-route", () => {
    it("classifies, then only that route's node runs", async () => {
      reply = by({ Classify: "Billing.", billing: "Refund on its way." });
      const result = await run("lg-route", "I was charged twice");
      expect(shape(result.steps)).toEqual(["0:classify", "1:billing"]);
      expect(result.graph?.ran).toEqual(["classify", "billing"]);
      expect(result.graph?.mermaid).toContain("classify -.-> technical");
      expect(result.output).toBe("Refund on its way.");
    });

    it("fails as invalid_output on a label that is not a route", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = () => "weather";
      expect((await runError("lg-route", "Will it rain?")).kind).toBe("invalid_output");
      expect(calls).toHaveLength(1);
    });
  });

  it("lg-parallel: three nodes in one superstep, then the join", async () => {
    reply = by({ "one word": "positive", "one sentence": "Good mug.", "key points": "- warm" });
    const result = await run("lg-parallel", "Great mug, keeps tea hot.");
    const lanes = shape(result.steps);
    expect(lanes.slice(0, 3).sort()).toEqual(["0:listKeyPoints", "0:rateSentiment", "0:summarise"]);
    expect(lanes[3]).toBe("1:join");
    expect(result.steps[3]?.kind).toBe("code");
    expect(result.output).toBe("Sentiment: positive\nSummary: Good mug.\nKey points:\n- warm");
  });

  describe("lg-orchestrate", () => {
    it("plans, sends at most 3 workers, then synthesizes", async () => {
      let synthInput = "";
      reply = (system, user) => {
        if (system.includes("plan work")) return "- a\n- b\n- c\n- d";
        if (system.includes("worker")) return `done ${user.split("Subtask: ")[1]}`;
        synthInput = user;
        return "All done.";
      };
      const result = await run("lg-orchestrate", "Launch a newsletter");
      const lanes = shape(result.steps);
      expect(lanes[0]).toBe("0:plan");
      expect(lanes.slice(1, 4).sort()).toEqual(["1:worker 1", "1:worker 2", "1:worker 3"]);
      expect(lanes[4]).toBe("2:synthesize");
      expect(result.graph?.ran).toEqual(["plan", "worker", "worker", "worker", "synthesize"]);
      expect(result.graph?.mermaid).toContain("plan -.-> worker");
      expect(synthInput).toContain("done a");
      expect(synthInput).toContain("done c");
      expect(synthInput).not.toContain("done d");
      expect(result.output).toBe("All done.");
    });

    it("fails as invalid_output when the plan has no subtasks", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = () => "Sure! Happy to help.";
      expect((await runError("lg-orchestrate", "Launch a newsletter")).kind).toBe("invalid_output");
    });
  });

  describe("lg-evaluate", () => {
    it("loops back to write on a FAIL and stops at the first PASS", async () => {
      const grades = ["FAIL: Too generic.", "PASS"];
      let rewriteInput = "";
      reply = (system, user) => {
        if (system.includes("grade")) return grades.shift() ?? "";
        if (user.includes("Feedback")) rewriteInput = user;
        return user.includes("Feedback") ? "Second try." : "First try.";
      };
      const result = await run("lg-evaluate", "A mug that keeps tea hot");
      expect(shape(result.steps)).toEqual([
        "0:write, round 1",
        "1:grade, round 1",
        "2:write, round 2",
        "3:grade, round 2",
      ]);
      expect(result.graph?.ran).toEqual(["write", "grade", "write", "grade"]);
      expect(rewriteInput).toContain("Earlier tagline: First try.");
      expect(rewriteInput).toContain("Feedback: Too generic.");
      expect(result.output).toBe("Second try.");
    });

    it("stops after 3 rounds, keeps the last tagline and says so", async () => {
      reply = (system) => (system.includes("grade") ? "FAIL: Still vague." : "Tagline.");
      const result = await run("lg-evaluate", "A mug");
      expect(result.steps).toHaveLength(6);
      expect(result.steps.at(-1)).toMatchObject({ lane: 5, label: "grade, round 3" });
      expect(result.output).toMatch(/^Tagline\.\n\n.*No pass after 3 rounds/);
    });

    it("fails as invalid_output on a grade that is neither PASS nor FAIL", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = (system) => (system.includes("grade") ? "Looks fine to me" : "Tagline.");
      expect((await runError("lg-evaluate", "A mug")).kind).toBe("invalid_output");
    });
  });

  it("maps a 429 to rate_limit without leaking provider text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failWith = Object.assign(new Error("429 secret detail"), { status: 429 });
    const error = await runError("lg-chain", "RAG");
    expect(error.kind).toBe("rate_limit");
    expect(error.message).not.toContain("secret");
  });

  it("fails without calling the model when the key is missing", async () => {
    const result = await new LangGraphWorkflows(undefined).run("lg-chain", "RAG");
    expect(!result.ok && result.error.kind).toBe("provider");
    expect(calls).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run src/infrastructure/ai/langgraph-workflows.test.ts`
Expected: FAIL, "Cannot find module './langgraph-workflows'".

- [ ] **Step 4: Write the six graphs and the runner**

Create `src/infrastructure/ai/langgraph-workflows.ts`:

```ts
import {
  END,
  ReducedValue,
  Send,
  START,
  StateGraph,
  StateSchema,
  type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import type { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { GraphId, IWorkflowRunner, WorkflowRun, WorkflowStep } from "@/domain/learn/workflow";
import { GenerationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";
import {
  ask,
  bullets,
  code,
  finishRun,
  HANDLERS,
  MAX_ROUNDS,
  MAX_WORKERS,
  NOT_SWITCHED_ON,
  PROMPTS,
  readGrade,
  ROUTES,
  UnreadableOutput,
  workflowModel,
  type Flow,
} from "./langchain-workflows";

// The LangGraph lessons (docs/lessons/07-12) teach these graphs. Same prompts, caps and errors as
// the LangChain versions, so the only new idea in each lesson is the graph.

const GREET_PROMPT =
  "You are a friendly tutor on a learn-in-public blog about AI engineering. " +
  "Greet the reader by name in one or two short sentences and welcome them to their first LangGraph lesson.";

/** The superstep a node runs in. Nodes in one superstep run at the same time: one lane in the flow. */
const laneOf = (config: LangGraphRunnableConfig) => Number(config.metadata?.langgraph_step ?? 0);

/** Each node adds the step it ran. The reducer joins steps from nodes that ran at the same time. */
const trace = () =>
  new ReducedValue(
    z.array(z.custom<WorkflowStep>()).default(() => []),
    {
      reducer: (current, next) => current.concat(next),
    },
  );

const STREAM = { streamMode: ["updates", "values"] as ("updates" | "values")[] };

/**
 * Reads a streamed run: each "updates" chunk names the node that just ran, the last "values"
 * chunk is the final state. Lanes arrive as superstep numbers and are renumbered from 0.
 */
async function readRun<S extends { trace: WorkflowStep[] }>(
  graph: { getGraphAsync(): Promise<{ drawMermaid(): string }> },
  chunks: AsyncIterable<[string, unknown]>,
): Promise<{ state: S; steps: WorkflowStep[]; graph: NonNullable<WorkflowRun["graph"]> }> {
  const ran: string[] = [];
  let state: S | undefined;
  for await (const [mode, chunk] of chunks) {
    if (mode === "updates") ran.push(...Object.keys(chunk as Record<string, unknown>));
    else state = chunk as S;
  }
  if (!state) throw new Error("The graph ended without a state.");
  const lanes = [...new Set(state.trace.map((s) => s.lane))].sort((a, b) => a - b);
  const steps = state.trace
    .map((s) => ({ ...s, lane: lanes.indexOf(s.lane) }))
    .sort((a, b) => a.lane - b.lane);
  return { state, steps, graph: { mermaid: (await graph.getGraphAsync()).drawMermaid(), ran } };
}

const GreetState = new StateSchema({
  name: z.string(),
  greeting: z.string().default(""),
  trace: trace(),
});

/** LangGraph 1: one node, one model call. */
export async function greetGraph(model: ChatOpenAI, name: string): Promise<Flow> {
  const graph = new StateGraph(GreetState)
    .addNode("greet", async (state, config) => {
      const input = `Hi, my name is ${state.name}.`;
      const { text, step } = await ask(model, laneOf(config), "greet", GREET_PROMPT, input);
      return { greeting: text, trace: [step] };
    })
    .addEdge(START, "greet")
    .addEdge("greet", END)
    .compile();
  const run = await readRun<typeof GreetState.State>(graph, await graph.stream({ name }, STREAM));
  return { steps: run.steps, output: run.state.greeting, graph: run.graph };
}

const ChainState = new StateSchema({
  topic: z.string(),
  outline: z.string().default(""),
  tweet: z.string().default(""),
  trace: trace(),
});

/** LangGraph 2: prompt chaining. The gate is a conditional edge that can go straight to END. */
export async function chainGraph(model: ChatOpenAI, topic: string): Promise<Flow> {
  const graph = new StateGraph(ChainState)
    .addNode("writeOutline", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, "writeOutline", PROMPTS.outline, state.topic);
      return { outline: text, trace: [step] };
    })
    .addNode("writeTweet", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, "writeTweet", PROMPTS.tweet, state.outline);
      return { tweet: text, trace: [step] };
    })
    .addEdge(START, "writeOutline")
    .addConditionalEdges(
      "writeOutline",
      (state) => (bullets(state.outline).length === 3 ? "writeTweet" : END),
      ["writeTweet", END],
    )
    .addEdge("writeTweet", END)
    .compile();
  const run = await readRun<typeof ChainState.State>(graph, await graph.stream({ topic }, STREAM));
  const points = bullets(run.state.outline).length;
  return {
    steps: run.steps,
    output:
      run.state.tweet ||
      `The gate stopped the chain: it wanted 3 bullets and got ${points}, so writeTweet never ran.`,
    graph: run.graph,
  };
}

type Route = (typeof ROUTES)[number];
const RouteState = new StateSchema({
  question: z.string(),
  route: z.enum(ROUTES).default("general"),
  answer: z.string().default(""),
  trace: trace(),
});

/** LangGraph 3: routing. The router is a conditional edge that returns the next node's name. */
export async function routeGraph(model: ChatOpenAI, question: string): Promise<Flow> {
  const handle =
    (route: Route) => async (state: typeof RouteState.State, config: LangGraphRunnableConfig) => {
      const { text, step } = await ask(
        model,
        laneOf(config),
        route,
        HANDLERS[route],
        state.question,
      );
      return { answer: text, trace: [step] };
    };
  const graph = new StateGraph(RouteState)
    .addNode("classify", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, "classify", PROMPTS.classify, state.question);
      const route = z.enum(ROUTES).safeParse(text.toLowerCase().replace(/[^a-z]/g, ""));
      if (!route.success) throw new UnreadableOutput(`route: ${text}`);
      return { route: route.data, trace: [step] };
    })
    .addNode("billing", handle("billing"))
    .addNode("technical", handle("technical"))
    .addNode("general", handle("general"))
    .addEdge(START, "classify")
    .addConditionalEdges("classify", (state) => state.route, ["billing", "technical", "general"])
    .addEdge("billing", END)
    .addEdge("technical", END)
    .addEdge("general", END)
    .compile();
  const run = await readRun<typeof RouteState.State>(
    graph,
    await graph.stream({ question }, STREAM),
  );
  return { steps: run.steps, output: run.state.answer, graph: run.graph };
}

const ParallelState = new StateSchema({
  review: z.string(),
  sentiment: z.string().default(""),
  summary: z.string().default(""),
  keyPoints: z.string().default(""),
  report: z.string().default(""),
  trace: trace(),
});

/** LangGraph 4: parallelization. Three edges out of START fan out; an edge from a list fans in. */
export async function parallelGraph(model: ChatOpenAI, review: string): Promise<Flow> {
  const graph = new StateGraph(ParallelState)
    .addNode("rateSentiment", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(
        model,
        lane,
        "rateSentiment",
        PROMPTS.sentiment,
        state.review,
      );
      return { sentiment: text, trace: [step] };
    })
    .addNode("summarise", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, "summarise", PROMPTS.summary, state.review);
      return { summary: text, trace: [step] };
    })
    .addNode("listKeyPoints", async (state, config) => {
      const lane = laneOf(config);
      const { text, step } = await ask(
        model,
        lane,
        "listKeyPoints",
        PROMPTS.keyPoints,
        state.review,
      );
      return { keyPoints: text, trace: [step] };
    })
    .addNode("join", (state, config) => {
      const report = `Sentiment: ${state.sentiment}\nSummary: ${state.summary}\nKey points:\n${state.keyPoints}`;
      return { report, trace: [code(laneOf(config), "join", report)] };
    })
    .addEdge(START, "rateSentiment")
    .addEdge(START, "summarise")
    .addEdge(START, "listKeyPoints")
    .addEdge(["rateSentiment", "summarise", "listKeyPoints"], "join")
    .addEdge("join", END)
    .compile();
  const run = await readRun<typeof ParallelState.State>(
    graph,
    await graph.stream({ review }, STREAM),
  );
  return { steps: run.steps, output: run.state.report, graph: run.graph };
}

const OrchestrateState = new StateSchema({
  goal: z.string(),
  subtasks: z.array(z.string()).default(() => []),
  results: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (current, next) => current.concat(next),
    },
  ),
  answer: z.string().default(""),
  trace: trace(),
});
/** What `Send` hands one worker: its own job, not the whole state. */
const WorkerJob = new StateSchema({ goal: z.string(), task: z.string(), index: z.number() });

/** LangGraph 5: orchestrator-workers. `Send` starts one worker per planned subtask. */
export async function orchestrateGraph(model: ChatOpenAI, goal: string): Promise<Flow> {
  const graph = new StateGraph(OrchestrateState)
    .addNode("plan", async (state, config) => {
      const { text, step } = await ask(model, laneOf(config), "plan", PROMPTS.plan, state.goal);
      const parsed = z.array(z.string().min(1)).min(1).safeParse(bullets(text));
      if (!parsed.success) throw new UnreadableOutput(`plan: ${text}`);
      return { subtasks: parsed.data.slice(0, MAX_WORKERS), trace: [step] };
    })
    .addNode(
      "worker",
      async (job, config) => {
        const n = job.index + 1;
        const input = `Goal: ${job.goal}\nSubtask: ${job.task}`;
        const { text, step } = await ask(
          model,
          laneOf(config),
          `worker ${n}`,
          PROMPTS.worker,
          input,
        );
        return { results: [`Result ${n} (${job.task}):\n${text}`], trace: [step] };
      },
      { input: WorkerJob },
    )
    .addNode("synthesize", async (state, config) => {
      const input = `Goal: ${state.goal}\n\n${state.results.join("\n\n")}`;
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, "synthesize", PROMPTS.synthesize, input);
      return { answer: text, trace: [step] };
    })
    .addEdge(START, "plan")
    .addConditionalEdges(
      "plan",
      (state) =>
        state.subtasks.map((task, index) => new Send("worker", { goal: state.goal, task, index })),
      ["worker"],
    )
    .addEdge("worker", "synthesize")
    .addEdge("synthesize", END)
    .compile();
  const run = await readRun<typeof OrchestrateState.State>(
    graph,
    await graph.stream({ goal }, STREAM),
  );
  return { steps: run.steps, output: run.state.answer, graph: run.graph };
}

const EvaluateState = new StateSchema({
  idea: z.string(),
  tagline: z.string().default(""),
  feedback: z.string().default(""),
  passed: z.boolean().default(false),
  round: z.number().default(0),
  trace: trace(),
});

/** LangGraph 6: evaluator-optimizer. A conditional edge loops back to `write` until a pass or the cap. */
export async function evaluateGraph(model: ChatOpenAI, idea: string): Promise<Flow> {
  const graph = new StateGraph(EvaluateState)
    .addNode("write", async (state, config) => {
      const round = state.round + 1;
      const input =
        round === 1
          ? state.idea
          : `Product idea: ${state.idea}\nEarlier tagline: ${state.tagline}\nFeedback: ${state.feedback}`;
      const lane = laneOf(config);
      const { text, step } = await ask(model, lane, `write, round ${round}`, PROMPTS.write, input);
      return { tagline: text, round, trace: [step] };
    })
    .addNode("grade", async (state, config) => {
      const input = `Product idea: ${state.idea}\nTagline: ${state.tagline}`;
      const label = `grade, round ${state.round}`;
      const { text, step } = await ask(model, laneOf(config), label, PROMPTS.grade, input);
      const grade = readGrade(text);
      return { passed: grade.pass, feedback: grade.feedback, trace: [step] };
    })
    .addEdge(START, "write")
    .addEdge("write", "grade")
    .addConditionalEdges(
      "grade",
      (state) => (state.passed || state.round >= MAX_ROUNDS ? END : "write"),
      ["write", END],
    )
    .compile();
  const run = await readRun<typeof EvaluateState.State>(
    graph,
    await graph.stream({ idea }, STREAM),
  );
  const { tagline, passed } = run.state;
  return {
    steps: run.steps,
    output: passed
      ? tagline
      : `${tagline}\n\n(No pass after ${MAX_ROUNDS} rounds, so the loop stopped and kept the last tagline.)`,
    graph: run.graph,
  };
}

const GRAPHS: Record<GraphId, (model: ChatOpenAI, input: string) => Promise<Flow>> = {
  "lg-greet": greetGraph,
  "lg-chain": chainGraph,
  "lg-route": routeGraph,
  "lg-parallel": parallelGraph,
  "lg-orchestrate": orchestrateGraph,
  "lg-evaluate": evaluateGraph,
};

export class LangGraphWorkflows implements IWorkflowRunner<GraphId> {
  private model: ChatOpenAI | undefined;

  constructor(private readonly apiKey: string | undefined) {}

  async run(id: GraphId, input: string): Promise<Result<WorkflowRun, GenerationError>> {
    if (!this.apiKey) return err(new GenerationError("provider", NOT_SWITCHED_ON));
    const model = (this.model ??= workflowModel(this.apiKey));
    return finishRun(id, () => GRAPHS[id](model, input));
  }
}
```

If typecheck rejects passing `graph.stream(...)` as `AsyncIterable<[string, unknown]>`, add `as AsyncIterable<[string, unknown]>` at the six call sites. Do not loosen anything else. If `{ input: WorkerJob }` is rejected, type the worker's first parameter as `typeof WorkerJob.State` explicitly.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run src/infrastructure/ai/langgraph-workflows.test.ts`
Expected: PASS.

Things to check if a test fails:

- **`invalid_output` tests come back as `provider`:** LangGraph wrapped the thrown error. In `finishRun`, also accept `error.cause instanceof UnreadableOutput`, and add a test case for it in `langchain-workflows.test.ts`.
- **Lane tests fail:** `config.metadata.langgraph_step` is missing. Log `config.metadata` in one node to see what LangGraph sends, then fix `laneOf`. Do not weaken the test.
- **Drawing tests fail:** compare the `mermaid` string to what the test expects (e.g. `plan -.-> worker`). Then fix the test string if LangGraph escapes names differently.

- [ ] **Step 6: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/infrastructure/ai/langgraph-workflows.ts src/infrastructure/ai/langgraph-workflows.test.ts
git commit -m "feat(learn): run the six LangGraph lessons as StateGraphs"
```

---

### Task 3: Route `lg-*` runs to the graph runner

**Files:**

- Modify: `src/application/learn-service.ts`
- Modify: `src/application/learn-service.test.ts`
- Modify: `src/lib/container.ts:117-125`

**Interfaces:**

- Consumes: `LangGraphWorkflows` (Task 2), `GRAPH_IDS`, `GraphId`, `isGraphId` (Task 1).
- Produces: `workflowSchema.id` accepts the five plain ids and the six `lg-*` ids. `new LearnService(greeter, workflows, limiter, graphs)`.

- [ ] **Step 1: Write the failing tests**

In `src/application/learn-service.test.ts`, change `make` to:

```ts
function make(limit = 5) {
  const greeter = new FakeGreeter();
  const workflows = new FakeWorkflowRunner();
  const graphs = new FakeWorkflowRunner();
  const limiter = new RateLimiter(limit, 60_000, new FixedClock(new Date("2026-03-10T12:00:00Z")));
  return {
    greeter,
    workflows,
    graphs,
    service: new LearnService(greeter, workflows, limiter, graphs),
  };
}
```

Add to `describe("workflowSchema")`:

```ts
it("takes the LangGraph lesson ids too", () => {
  expect(workflowSchema.safeParse({ id: "lg-chain", input: "hi" }).success).toBe(true);
  expect(workflowSchema.safeParse({ id: "lg-agent", input: "hi" }).success).toBe(false);
});
```

Add to `describe("LearnService.runWorkflow")`:

```ts
it("sends LangGraph lesson ids to the graph runner", async () => {
  const { workflows, graphs, service } = make();
  await service.runWorkflow("ip", workflowSchema.parse({ id: "lg-route", input: "hi" }));
  expect(graphs.calls).toEqual([{ id: "lg-route", input: "hi" }]);
  expect(workflows.calls).toHaveLength(0);
});

it("limits graph runs with the same shared limit", async () => {
  const { graphs, service } = make(1);
  await service.runWorkflow("ip", run("hi"));
  const blocked = await service.runWorkflow(
    "ip",
    workflowSchema.parse({ id: "lg-chain", input: "hi" }),
  );
  expect(!blocked.ok && blocked.error.kind).toBe("rate_limit");
  expect(graphs.calls).toHaveLength(0);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run src/application/learn-service.test.ts`
Expected: FAIL. The constructor takes 3 arguments, and `lg-chain` is not in the enum.

- [ ] **Step 3: Implement**

In `src/application/learn-service.ts`:

```ts
import {
  GRAPH_IDS,
  isGraphId,
  WORKFLOW_IDS,
  type GraphId,
  type IWorkflowRunner,
  type PlainWorkflowId,
  type WorkflowRun,
} from "@/domain/learn/workflow";
```

```ts
export const workflowSchema = z.object({
  id: z.enum([...WORKFLOW_IDS, ...GRAPH_IDS]),
  input: z.string().trim().min(1, "Type something to run").max(200, "Keep it to 200 characters"),
  website: honeypot,
});
```

```ts
  constructor(
    private readonly greeter: IGreeter,
    private readonly workflows: IWorkflowRunner<PlainWorkflowId>,
    private readonly limiter: RateLimiter,
    /** The LangGraph lessons: the same workflows, built as graphs. */
    private readonly graphs: IWorkflowRunner<GraphId>,
  ) {}
```

```ts
  async runWorkflow(
    clientKey: string,
    input: WorkflowInput,
  ): Promise<Result<WorkflowRun, GenerationError>> {
    const { id } = input;
    return (
      this.blocked(clientKey, input.website) ??
      (isGraphId(id) ? this.graphs.run(id, input.input) : this.workflows.run(id, input.input))
    );
  }
```

In `src/lib/container.ts`, import `LangGraphWorkflows` from `@/infrastructure/ai/langgraph-workflows`, and add a 4th argument to the `LearnService` constructor:

```ts
    /** Lesson playgrounds: 5 runs per IP per minute, shared by every lesson. */
    learn: () =>
      (learn ??= new LearnService(
        new LangChainGreeter(getEnv().OPENAI_API_KEY),
        new LangChainWorkflows(getEnv().OPENAI_API_KEY),
        new RateLimiter(5, 60_000, clock),
        new LangGraphWorkflows(getEnv().OPENAI_API_KEY),
      )),
```

`src/app/actions/learn.ts` needs no change, because it parses with `workflowSchema`.

- [ ] **Step 4: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/application/learn-service.ts src/application/learn-service.test.ts src/lib/container.ts
git commit -m "feat(learn): send LangGraph lesson runs to the graph runner"
```

---

### Task 4: Graph view

**Files:**

- Create: `src/domain/learn/graph-drawing.ts`
- Create: `src/domain/learn/graph-drawing.test.ts`
- Create: `src/components/learn/graph-view.tsx`
- Modify: `src/components/learn/workflow-playground.tsx`
- Modify: `package.json`, `pnpm-lock.yaml` (via `pnpm add`)

**Interfaces:**

- Consumes: `WorkflowRun.graph` (Task 1).
- Produces: `prepareMermaid(mermaid: string, ran?: readonly string[]): string`. Also `GraphView({ mermaid, ran }: { mermaid: string; ran?: string[] })`, a client component.

`prepareMermaid` makes four changes:

- relabels `<p>__start__</p>` / `<p>__end__</p>` as `START` / `END`;
- drops LangGraph's fixed `classDef` colours and the `:::first` / `:::last` markers that use them, so the site's Mermaid theme colours the graph in light and dark;
- marks the nodes in `ran` with a `ran` class (orange border);
- drops any name that isn't a plain word, so nothing odd gets into the diagram text.

- [ ] **Step 1: Write the failing test**

Create `src/domain/learn/graph-drawing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prepareMermaid } from "./graph-drawing";

// What drawMermaid() returns for START → plan -.-> worker → synthesize → END.
const DRAWN = `%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
\t__start__([<p>__start__</p>]):::first
\tplan(plan)
\tworker(worker)
\tsynthesize(synthesize)
\t__end__([<p>__end__</p>]):::last
\t__start__ --> plan;
\tsynthesize --> __end__;
\tworker --> synthesize;
\tplan -.-> worker;
\tclassDef default fill:#f2f0ff,line-height:1.2
\tclassDef first fill-opacity:0
\tclassDef last fill:#bfb6fc
`;

describe("prepareMermaid", () => {
  it("labels START and END and drops LangGraph's fixed colours", () => {
    const out = prepareMermaid(DRAWN);
    expect(out).toContain("__start__([START])");
    expect(out).toContain("__end__([END])");
    expect(out).not.toContain("classDef default");
    expect(out).not.toContain(":::first");
    expect(out).not.toContain(":::last");
    expect(out).toContain("plan -.-> worker;");
  });

  it("marks each node that ran once", () => {
    const out = prepareMermaid(DRAWN, ["plan", "worker", "worker", "synthesize"]);
    expect(out).toContain("classDef ran ");
    expect(out.trimEnd().endsWith("class plan,worker,synthesize ran;")).toBe(true);
  });

  it("adds no class line when nothing ran, and ignores names that aren't plain words", () => {
    expect(prepareMermaid(DRAWN)).not.toContain("classDef ran");
    expect(prepareMermaid(DRAWN, ["plan; click plan"])).not.toContain("classDef ran");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/domain/learn/graph-drawing.test.ts`
Expected: FAIL, "Cannot find module './graph-drawing'".

- [ ] **Step 3: Implement `prepareMermaid`**

Create `src/domain/learn/graph-drawing.ts`:

```ts
/**
 * Gets LangGraph's Mermaid text (drawMermaid) ready for the page: START/END labels, no fixed
 * colours (the site's Mermaid theme picks them, so it reads in light and dark), and the nodes
 * that ran marked so the reader sees the path the run took.
 */
export function prepareMermaid(mermaid: string, ran: readonly string[] = []): string {
  const lines = mermaid
    .replace("<p>__start__</p>", "START")
    .replace("<p>__end__</p>", "END")
    .replaceAll(":::first", "")
    .replaceAll(":::last", "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("classDef"));
  const nodes = [...new Set(ran)].filter((node) => /^\w+$/.test(node));
  if (nodes.length > 0) {
    lines.push("\tclassDef ran stroke:#f97316,stroke-width:3px;");
    lines.push(`\tclass ${nodes.join(",")} ran;`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/domain/learn/graph-drawing.test.ts`
Expected: PASS.

- [ ] **Step 5: Install Mermaid**

Run: `pnpm add mermaid@12.2.0`

- [ ] **Step 6: Write `GraphView`**

Create `src/components/learn/graph-view.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { prepareMermaid } from "@/domain/learn/graph-drawing";

/**
 * The graph LangGraph drew for this run, with the nodes that ran outlined.
 * Mermaid is loaded only when a run has a graph, so other pages never download it.
 */
export function GraphView({ mermaid, ran = [] }: { mermaid: string; ran?: string[] }) {
  const { resolvedTheme } = useTheme();
  // Mermaid uses the id in CSS selectors, so keep only characters CSS accepts.
  const id = `graph-${useId().replace(/[^\w-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const text = prepareMermaid(mermaid, ran);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { default: m } = await import("mermaid");
        m.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
        });
        const drawn = await m.render(id, text);
        if (live) {
          setSvg(drawn.svg);
          setFailed(false);
        }
      } catch (error) {
        console.error("[graph-view] render failed", error);
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [id, text, resolvedTheme]);

  const path = ran.filter((node, i) => node !== ran[i - 1]).join(" → ");
  return (
    <figure className="rounded-xl border border-ember-line bg-card p-3">
      {failed ? (
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed">{mermaid}</pre>
      ) : svg ? (
        // Mermaid's own SVG, sanitised by securityLevel "strict"; the text comes from our server.
        <div
          className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Drawing the graph…</p>
      )}
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        The graph, drawn by LangGraph. {path && <>Ran: {path}.</>}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 7: Show it in the playground after a run**

In `src/components/learn/workflow-playground.tsx`:

1. Add the import: `import { GraphView } from "@/components/learn/graph-view";`
2. Insert this directly before `<ol aria-label="Workflow" className="mt-6">`:

```tsx
{
  run?.graph && (
    <div className="mt-6">
      <GraphView mermaid={run.graph.mermaid} ran={run.graph.ran} />
    </div>
  );
}
```

Before a run nothing extra is shown, and the LangChain lessons never have `run.graph`.

- [ ] **Step 8: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/domain/learn/graph-drawing.ts src/domain/learn/graph-drawing.test.ts src/components/learn/graph-view.tsx src/components/learn/workflow-playground.tsx
git commit -m "feat(learn): draw the LangGraph graph after a run and outline the nodes that ran"
```

---

### Task 5: Teaching code and walkthroughs for the six graph lessons

**Files:**

- Create: `src/components/learn/graph-lessons.tsx`
- Modify: `src/components/learn/lesson-playground.tsx:3,95-104`

**Interfaces:**

- Consumes: `lessonWith`, `C`, `llm`, `code`, `Playground` from `workflow-lessons.tsx` (Task 1); `GraphId` (Task 1).
- Produces: `GRAPH_LESSONS: Record<GraphId, Lesson>`, spread into `LESSONS`. After this task `hasLesson("lg-chain")` is true.

The code shown to readers is a teaching copy. The real graphs live in `langgraph-workflows.ts`. Keep the same node names in both, so the flow boxes and the drawing match the code. Escapes: `\${` and `\\n` show up as `${` and `\n`.

- [ ] **Step 1: Write `graph-lessons.tsx`**

Create `src/components/learn/graph-lessons.tsx`:

```tsx
import type { Lesson } from "@/components/learn/lesson-playground";
import { C, code, lessonWith, llm } from "@/components/learn/workflow-lessons";
import type { GraphId } from "@/domain/learn/workflow";

// Teaching copies of the six graphs (src/infrastructure/ai/langgraph-workflows.ts runs the real
// ones, with the same node names). Patterns follow the Python langgraph-tutorials notebooks,
// rebuilt in TypeScript with our own code: 1_bmi + 2_simple_llm (greet), 3_prompt_chaining
// (chain), 6_quadratic + 7_review_reply (route), 4_batsman + 5_UPSC_essay (parallel),
// 8_X_post_generator (evaluate). Orchestrate follows the LangGraph `Send` docs.
// Escapes: \${ and \\n show up as ${ and \n in the code the reader sees.

/** Every graph lesson starts with this: LangGraph imports, the model and the one-call helper. */
const prelude = (imports: string) => `import { ${imports} } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({ model: "gpt-4o-mini", maxTokens: 200 });

// One LLM call: our instructions (system) + the user's text (human).
// The same helper as the LangChain lessons. Nodes call it.
async function ask(system: string, input: string) {
  const reply = await model.invoke([
    ["system", system],
    ["human", input],
  ]);
  return reply.text.trim();
}`;

const BASIC = "END, START, StateGraph, StateSchema";

const GREET_CODE = `${prelude(BASIC)}

// The state: the data every node reads and writes. Zod describes each field.
const State = new StateSchema({
  name: z.string(),
  greeting: z.string().default(""),
});

// A node: state in, an update out. It returns only the fields it changed.
async function greet(state: typeof State.State) {
  const greeting = await ask(
    "Greet the reader by name in one or two short sentences.",
    \`Hi, my name is \${state.name}.\`,
  );
  return { greeting };
}

// The graph: nodes, plus edges that say what runs next.
export const graph = new StateGraph(State)
  .addNode("greet", greet)
  .addEdge(START, "greet")
  .addEdge("greet", END)
  .compile(); // checks the wiring and gives you something you can run

// const { greeting } = await graph.invoke({ name: "Sam" });`;

const CHAIN_CODE = `${prelude(BASIC)}

const State = new StateSchema({
  topic: z.string(),
  outline: z.string().default(""),
  tweet: z.string().default(""),
});
type S = typeof State.State;

// A node's name can't be a state key, so nodes are verbs and keys are nouns.
async function writeOutline(state: S) {
  const outline = await ask(
    'Outline a short post on the topic. Exactly 3 lines, each starting with "- ".',
    state.topic,
  );
  return { outline };
}

async function writeTweet(state: S) {
  // The hand-off: this node reads what writeOutline wrote into the state.
  const tweet = await ask("Turn these bullet points into one tweet. No hashtags.", state.outline);
  return { tweet };
}

// The gate: plain code that picks where to go next. No model, no cost.
function gate(state: S) {
  const bullets = state.outline.split("\\n").filter((line) => line.startsWith("- "));
  return bullets.length === 3 ? "writeTweet" : END;
}

export const graph = new StateGraph(State)
  .addNode("writeOutline", writeOutline)
  .addNode("writeTweet", writeTweet)
  .addEdge(START, "writeOutline")
  // A conditional edge: after writeOutline, gate picks the next stop.
  // The list names every place it can go, so the drawing shows both.
  .addConditionalEdges("writeOutline", gate, ["writeTweet", END])
  .addEdge("writeTweet", END)
  .compile();`;

const ROUTE_CODE = `${prelude(BASIC)}

const Route = z.enum(["billing", "technical", "general"]);

const State = new StateSchema({
  question: z.string(),
  route: Route.default("general"),
  answer: z.string().default(""),
});
type S = typeof State.State;

async function classify(state: S) {
  const label = await ask(
    "Classify the customer message. Reply with one word: billing, technical or general.",
    state.question,
  );
  // Check the label before you trust it: parse throws if it isn't a route.
  return { route: Route.parse(label.toLowerCase().replace(/[^a-z]/g, "")) };
}

// One node per route, each with its own instructions.
const handler = (system: string) => async (state: S) => ({
  answer: await ask(system, state.question),
});

export const graph = new StateGraph(State)
  .addNode("classify", classify)
  .addNode("billing", handler("You are a billing specialist. Explain charges and refunds."))
  .addNode("technical", handler("You are a support engineer. Give clear troubleshooting steps."))
  .addNode("general", handler("You are a friendly support agent."))
  .addEdge(START, "classify")
  // The router: return the next node's name. Only that node runs.
  .addConditionalEdges("classify", (state) => state.route, ["billing", "technical", "general"])
  .addEdge("billing", END)
  .addEdge("technical", END)
  .addEdge("general", END)
  .compile();`;

const PARALLEL_CODE = `${prelude(BASIC)}

const State = new StateSchema({
  review: z.string(),
  sentiment: z.string().default(""),
  summary: z.string().default(""),
  keyPoints: z.string().default(""),
  report: z.string().default(""),
});
type S = typeof State.State;

// Three nodes. Each reads only the review and writes its own field.
const rateSentiment = async (state: S) => ({
  sentiment: await ask("Reply with one word: positive, negative or mixed.", state.review),
});
const summarise = async (state: S) => ({
  summary: await ask("Summarise the product review in one sentence.", state.review),
});
const listKeyPoints = async (state: S) => ({
  keyPoints: await ask('List at most 3 key points, each starting with "- ".', state.review),
});

// The join: plain code. It runs once all three are done.
const join = (state: S) => ({
  report: \`Sentiment: \${state.sentiment}\\nSummary: \${state.summary}\\nKey points:\\n\${state.keyPoints}\`,
});

export const graph = new StateGraph(State)
  .addNode("rateSentiment", rateSentiment)
  .addNode("summarise", summarise)
  .addNode("listKeyPoints", listKeyPoints)
  .addNode("join", join)
  // Fan out: three edges from START, so all three run in the same step.
  .addEdge(START, "rateSentiment")
  .addEdge(START, "summarise")
  .addEdge(START, "listKeyPoints")
  // Fan in: an edge from a list waits for every node in it.
  .addEdge(["rateSentiment", "summarise", "listKeyPoints"], "join")
  .addEdge("join", END)
  .compile();`;

const ORCHESTRATE_CODE = `${prelude("END, ReducedValue, START, Send, StateGraph, StateSchema")}

const State = new StateSchema({
  goal: z.string(),
  subtasks: z.array(z.string()).default(() => []),
  // A reducer: each worker adds to the list instead of overwriting it.
  results: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (current, next) => current.concat(next),
  }),
  answer: z.string().default(""),
});
// What one worker gets: its own job, not the whole state.
const Job = new StateSchema({ goal: z.string(), task: z.string() });

async function plan(state: typeof State.State) {
  const text = await ask(
    'Break the goal into 2 or 3 independent subtasks. One per line, each starting with "- ".',
    state.goal,
  );
  const subtasks = text
    .split("\\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2))
    .slice(0, 3); // cap the cost: at most 3 workers
  return { subtasks };
}

async function worker(job: typeof Job.State) {
  const result = await ask(
    "Do only this subtask, in 2 or 3 sentences.",
    \`Goal: \${job.goal}\\nSubtask: \${job.task}\`,
  );
  return { results: [result] };
}

async function synthesize(state: typeof State.State) {
  const answer = await ask(
    "Combine the results into one short, clear answer to the goal.",
    \`Goal: \${state.goal}\\n\\n\${state.results.join("\\n\\n")}\`,
  );
  return { answer };
}

// Send: one worker per subtask. Nobody knows how many until plan has run.
const assignWorkers = (state: typeof State.State) =>
  state.subtasks.map((task) => new Send("worker", { goal: state.goal, task }));

export const graph = new StateGraph(State)
  .addNode("plan", plan)
  .addNode("worker", worker, { input: Job })
  .addNode("synthesize", synthesize)
  .addEdge(START, "plan")
  .addConditionalEdges("plan", assignWorkers, ["worker"])
  .addEdge("worker", "synthesize") // waits for every worker
  .addEdge("synthesize", END)
  .compile();`;

const EVALUATE_CODE = `${prelude(BASIC)}

const State = new StateSchema({
  idea: z.string(),
  tagline: z.string().default(""),
  feedback: z.string().default(""),
  passed: z.boolean().default(false),
  round: z.number().default(0),
});
type S = typeof State.State;

// The optimizer: writes, or rewrites using the feedback.
async function write(state: S) {
  const round = state.round + 1;
  const tagline = await ask(
    "Write one tagline under 12 words. If you get feedback, fix what it points out.",
    round === 1
      ? state.idea
      : \`Idea: \${state.idea}\\nEarlier tagline: \${state.tagline}\\nFeedback: \${state.feedback}\`,
  );
  return { tagline, round };
}

// The evaluator: grades against clear rules and says why it failed.
async function grade(state: S) {
  const verdict = await ask(
    'Grade the tagline: says what makes the product different, no cliches. Reply "PASS" or "FAIL: <why>".',
    \`Idea: \${state.idea}\\nTagline: \${state.tagline}\`,
  );
  return { passed: verdict.startsWith("PASS"), feedback: verdict.replace(/^FAIL:\\s*/, "") };
}

// The loop: back to write on a FAIL; out on a PASS or after 3 rounds.
// Without the cap, a loop can run (and cost) forever.
const next = (state: S) => (state.passed || state.round >= 3 ? END : "write");

export const graph = new StateGraph(State)
  .addNode("write", write)
  .addNode("grade", grade)
  .addEdge(START, "write")
  .addEdge("write", "grade")
  .addConditionalEdges("grade", next, ["write", END])
  .compile();`;

const GRAPH_MATCH = (
  <>
    <li>
      <C>ask</C> is the same one-call helper as in the LangChain lessons. Every node calls it.
    </li>
    <li>
      <C>StateSchema</C> lists the state&apos;s fields with Zod. Each node returns only the fields
      it changed, and LangGraph merges them in.
    </li>
  </>
);

const lesson = lessonWith(GRAPH_MATCH);

/** The six LangGraph lessons, by playground id. Spread into LESSONS. */
export const GRAPH_LESSONS: Record<GraphId, Lesson> = Object.fromEntries([
  lesson(
    "lg-greet",
    "greet-graph.ts",
    GREET_CODE,
    {
      field: { label: "Your name (the input state)", placeholder: "e.g. Sam" },
      shape: [[llm("greet")]],
    },
    <>
      <li>
        <C>greet</C> is a node: it reads <C>state.name</C> and returns <C>{"{ greeting }"}</C>. It
        never touches the rest of the state.
      </li>
      <li>
        <C>addNode</C> puts it in the graph. <C>addEdge(START, &quot;greet&quot;)</C> says where a
        run begins, <C>addEdge(&quot;greet&quot;, END)</C> where it stops.
      </li>
      <li>
        <C>compile()</C> checks the wiring. A missing edge or a node named like a state key fails
        here, before any call is paid for.
      </li>
    </>,
    <>
      <p>
        Type your name and press <strong>Run workflow</strong>:
      </p>
      <ol>
        <li>LangGraph draws the graph: START, one node, END. The node that ran is outlined.</li>
        <li>
          The <C>greet</C> box shows the reply. Open <strong>Sent to the model</strong> to see the
          two messages.
        </li>
        <li>One node, one call. Lesson 2 adds a second node and an edge that can choose.</li>
      </ol>
    </>,
  ),
  lesson(
    "lg-chain",
    "chain-graph.ts",
    CHAIN_CODE,
    {
      field: {
        label: "A topic (the input state)",
        placeholder: "e.g. Why RAG needs good chunking",
      },
      shape: [[llm("writeOutline")], [llm("writeTweet")]],
      note: "Between the two nodes, a conditional edge (the gate) can send the run straight to END.",
    },
    <>
      <li>
        <C>writeOutline</C> writes <C>outline</C> into the state. <C>writeTweet</C> reads it. That
        hand-off through the state is the chain.
      </li>
      <li>
        <C>gate</C> is plain code that returns the next node&apos;s name, or <C>END</C>.
      </li>
      <li>
        <C>addConditionalEdges</C> runs <C>gate</C> after <C>writeOutline</C>. The list{" "}
        <C>[&quot;writeTweet&quot;, END]</C> names every place it can go.
      </li>
    </>,
    <>
      <p>Type a topic and run it:</p>
      <ol>
        <li>
          In the drawing, the dotted lines leave <C>writeOutline</C>: dotted means a conditional
          edge.
        </li>
        <li>The outline box shows three bullets, then the tweet box runs.</li>
        <li>
          If the outline comes back with a different count, the run ends after one box and{" "}
          <C>writeTweet</C> is not outlined: the gate saved a call.
        </li>
      </ol>
    </>,
  ),
  lesson(
    "lg-route",
    "route-graph.ts",
    ROUTE_CODE,
    {
      field: {
        label: "A customer question",
        placeholder: "e.g. I was charged twice for one order",
      },
      shape: [[llm("classify")], [llm("billing, technical or general")]],
      note: "Only one route node runs: the conditional edge picks it.",
    },
    <>
      <li>
        <C>classify</C> only picks a label. <C>Route.parse</C> rejects anything off the list before
        the graph trusts it.
      </li>
      <li>
        <C>handler</C> makes one node per route, each with its own instructions.
      </li>
      <li>
        The router is the arrow function in <C>addConditionalEdges</C>: it returns{" "}
        <C>state.route</C>, the name of the next node.
      </li>
    </>,
    <>
      <p>Ask a question, then one from a different route:</p>
      <ol>
        <li>
          The drawing shows three dotted lines out of <C>classify</C>, one per route.
        </li>
        <li>Only one route node is outlined, and only one route box appears below it.</li>
        <li>
          Open <strong>Sent to the model</strong> on the route box: the system message changes from
          route to route.
        </li>
      </ol>
    </>,
  ),
  lesson(
    "lg-parallel",
    "parallel-graph.ts",
    PARALLEL_CODE,
    {
      field: {
        label: "A product review",
        placeholder: "e.g. Keeps tea hot for hours, but the lid leaks",
      },
      shape: [[llm("rateSentiment"), llm("summarise"), llm("listKeyPoints")], [code("join")]],
    },
    <>
      <li>
        Three edges leave <C>START</C>, so the three nodes run in the same step. That is the fan
        out.
      </li>
      <li>
        Each writes its <strong>own</strong> field. Two nodes writing the same field in one step is
        an error unless that field has a reducer (lesson 5).
      </li>
      <li>
        <C>addEdge([...], &quot;join&quot;)</C> takes a list: <C>join</C> waits for all three. That
        is the fan in.
      </li>
    </>,
    <>
      <p>Paste a review and run it:</p>
      <ol>
        <li>
          The drawing shows three arrows from START and three into <C>join</C>.
        </li>
        <li>Three boxes sit side by side: they ran at the same time.</li>
        <li>
          The dashed <C>join</C> box is plain code: no model, no tokens.
        </li>
      </ol>
    </>,
  ),
  lesson(
    "lg-orchestrate",
    "orchestrate-graph.ts",
    ORCHESTRATE_CODE,
    {
      field: { label: "A goal", placeholder: "e.g. Launch a weekly newsletter about AI tools" },
      shape: [
        [llm("plan")],
        [llm("worker 1"), llm("worker 2"), llm("worker 3")],
        [llm("synthesize")],
      ],
      note: "plan decides how many workers run: 2 or 3, all from one worker node.",
    },
    <>
      <li>
        <C>plan</C> writes the subtasks into the state. The graph doesn&apos;t know them in advance.
      </li>
      <li>
        <C>assignWorkers</C> returns one <C>Send</C> per subtask. Each <C>Send</C> runs the{" "}
        <C>worker</C> node once, with its own small input (<C>Job</C>).
      </li>
      <li>
        <C>results</C> has a <strong>reducer</strong>: each worker&apos;s list is added to the
        others, not written over them.
      </li>
      <li>
        <C>synthesize</C> runs once, after every worker is done.
      </li>
    </>,
    <>
      <p>Type a goal and run it:</p>
      <ol>
        <li>
          The drawing has one <C>worker</C> node: Send runs it many times.
        </li>
        <li>One worker box per subtask, side by side. Try another goal: the count can change.</li>
        <li>
          The <C>synthesize</C> box&apos;s human message holds every worker&apos;s result, joined by
          the reducer.
        </li>
      </ol>
    </>,
  ),
  lesson(
    "lg-evaluate",
    "evaluate-graph.ts",
    EVALUATE_CODE,
    {
      field: {
        label: "A product idea",
        placeholder: "e.g. A mug that keeps tea at the right temperature",
      },
      shape: [[llm("write")], [llm("grade")]],
      note: "On a FAIL, a conditional edge goes back to write: up to 3 rounds.",
    },
    <>
      <li>
        <C>write</C> counts the rounds in the state, and from round 2 reads the feedback.
      </li>
      <li>
        <C>grade</C> writes <C>passed</C> and <C>feedback</C> into the state.
      </li>
      <li>
        <C>next</C> is the loop: it can point back to an earlier node. The <C>round &gt;= 3</C>{" "}
        check is what stops it.
      </li>
    </>,
    <>
      <p>Describe a product and run it:</p>
      <ol>
        <li>
          The drawing shows a dotted line from <C>grade</C> back to <C>write</C>: the loop.
        </li>
        <li>Each round adds a write box and a grade box below the last.</li>
        <li>After 3 FAILs the run stops and says so at END, keeping the last tagline.</li>
      </ol>
    </>,
  ),
]) as Record<GraphId, Lesson>;
```

- [ ] **Step 2: Register the lessons**

In `src/components/learn/lesson-playground.tsx`:

```ts
import { GRAPH_LESSONS } from "@/components/learn/graph-lessons";
```

```ts
  ...WORKFLOW_LESSONS,
  ...GRAPH_LESSONS,
};
```

- [ ] **Step 3: Run the checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS. If ESLint flags the circular import between `graph-lessons.tsx` and `lesson-playground.tsx`, it is the same type-only cycle `workflow-lessons.tsx` already has. Keep the `Lesson` import as `import type`.

- [ ] **Step 4: Commit**

```bash
git add src/components/learn/graph-lessons.tsx src/components/learn/lesson-playground.tsx
git commit -m "feat(learn): teaching code and walkthroughs for the six LangGraph lessons"
```

---

### Task 6: The six lesson posts

**Files:**

- Create: `docs/lessons/07-langgraph-intro.md`
- Create: `docs/lessons/08-langgraph-chaining.md`
- Create: `docs/lessons/09-langgraph-routing.md`
- Create: `docs/lessons/10-langgraph-parallel.md`
- Create: `docs/lessons/11-langgraph-orchestrator.md`
- Create: `docs/lessons/12-langgraph-evaluator.md`
- Modify: `docs/add-blog.md` (the playground id list)

Posts follow `docs/add-blog.md`:

- Feynman style. No code in the post: the code lives in the playground.
- `concepts` lines have exactly 3 cells.
- One `playground` fence at the end.
- Analogy for the whole series: a **train network**. Stations are nodes, tracks are edges, the passenger's ticket is the state.

- [ ] **Step 1: Write `docs/lessons/07-langgraph-intro.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 1: a graph with one node
Summary: The same one-call greeter as LangChain lesson 1, built as a graph: state, a node, edges from START to END.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

A **graph** is your workflow drawn as a map: **nodes** do the work, **edges** say what runs next, and the **state** is the data that travels along.

LangChain lessons 2–6 joined calls with plain code. LangGraph lets you draw the same steps as a graph, so the framework runs them, can show you the path, and later can pause, resume and loop.

## Think of a train line

A ticket goes in at the first station. At each station, someone stamps something new on it. The tracks decide which station comes next. At the last station, you read everything stamped on the ticket.

```concepts
Concept | What it is | On the train line
State | The data every node reads and writes, described with Zod in a `StateSchema` | The ticket
Node | A function: state in, only the changed fields out | A station that stamps the ticket
Edge | A link that says which node runs next | A track between two stations
START and END | Where every run begins and stops | The first and last station
Compile | Checks the wiring and gives you a graph you can run | The safety check before the line opens
Invoke | Runs the graph with a starting state and returns the final state | Sending one passenger down the line
```

## Warm-up: a graph with no model

The tutorials I'm following start with a graph that has no LLM (large language model) in it at all. One node works out a BMI from weight and height, a second node turns the number into a label. Two stations, one ticket, no API key.

It's worth doing once. It shows the graph is just your functions in an order, and the model is only one thing a node can call.

## Where people get stuck

- A node returns **only the fields it changed**. LangGraph merges them into the state. You don't copy the whole state back.
- A node's **name can't be the same as a state key**. If the state has `greeting`, call the node `greet`. LangGraph.js throws otherwise.
- Nothing runs until you **compile** and **invoke**. Building the graph only describes it.
- A one-node graph is more code than one call. The payoff comes in the next lessons, when the edges start making choices.

## Say it back

Try it in one sentence before you read mine:

> A LangGraph graph is a map of nodes joined by edges, and one state object travels from START to END while each node writes its part.

## What's next

In the playground, your name goes in as the state and one node greets you. LangGraph draws the graph and outlines the node that ran. Next lesson: a second node, and an edge that can stop the line.

```playground
lg-greet
```
````

- [ ] **Step 2: Write `docs/lessons/08-langgraph-chaining.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 2: prompt chaining with a conditional edge
Summary: Two nodes in a row, and a gate that can end the run early. The gate is a conditional edge: plain code that picks the next node.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Prompt chaining** in a graph is nodes in a row, each reading what the last one wrote into the state. A **conditional edge** between them is the gate: plain code that picks the next node, or END.

It's the same workflow as LangChain lesson 2. The difference is where the decision lives: in an edge, where the graph can see it and draw it.

## Think of a signal on the line

The train leaves the first station. Before the next one, there's a signal. If the carriage is loaded right, the signal is green and the train goes on. If not, it's red and the train goes to the depot. Nobody at the next station wastes time on a bad load.

```concepts
Concept | What it is | On the train line
Hand-off | One node writes a field, the next node reads it from the state | Cargo loaded at one station, unloaded at the next
Conditional edge | A function that reads the state and returns the next node's name, or END | A signal that chooses the track
Path list | Every place a conditional edge can go, given when you add it | The tracks drawn on the map, even the ones not taken
Gate | A conditional edge that can stop the run early | A red signal that sends the train to the depot
```

## Warm-up: the review that picks a path

The tutorials show this with a review: one node finds the sentiment, and the edge sends a happy review to a thank-you node and an unhappy one to a support node. Same idea as our gate: plain code reads the state and chooses the track.

## Where people get stuck

- The edge function **returns a name**, not a result. `"writeTweet"` or `END`.
- Give the **path list** (`["writeTweet", END]`). Without it the drawing guesses and shows a line to every node.
- The gate is **code, not a model call**. Counting bullets is free and never wrong.
- A gate only works if the first node has a **strict format** to check.

## Say it back

Try it in one sentence before you read mine:

> In a graph, a chain is nodes passing data through the state, and a conditional edge is the plain-code gate that picks the next node or ends the run.

## What's next

In the playground, a topic becomes an outline, the gate checks it, then a tweet. Watch the dotted line in the drawing: that's the conditional edge. Next lesson: an edge with three tracks to choose from.

```playground
lg-chain
```
````

- [ ] **Step 3: Write `docs/lessons/09-langgraph-routing.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 3: routing
Summary: One node picks a label, and a conditional edge sends the question to the one node built for it.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Routing** in a graph: a classifier node writes a label into the state, and a conditional edge returns that label as the next node's name. Only one route node runs.

## Think of a junction

The train reaches a junction. The points are set by what's on the ticket: billing passengers go one way, technical another, everyone else a third. Each line ends at a station that's good at one thing.

```concepts
Concept | What it is | In the junction
Classifier node | A node that only picks a label and writes it into the state | Reading the ticket's destination
Router | A conditional edge that returns the label as the next node's name | Setting the points
Route node | One node per route, with its own instructions | A station that handles one kind of passenger
Check the label | Parse the label against the list before trusting it | Refusing a ticket for a station that doesn't exist
```

## Warm-up: maths that picks a branch

Before any model, the tutorials route on a number. Work out the discriminant of a quadratic equation: above zero goes to a "two roots" node, zero to "one root", below zero to "no real roots". Same router, and you can test every branch without spending a token.

## Where people get stuck

- The router can only return **names that are in the path list**. Check the model's label against that list first.
- Models answer "Billing." or "I think billing". **Clean** the label before you check it.
- Every route node needs an **edge to END**, or the run has nowhere to go after it.
- Routing is worth it when routes really **need different instructions**. If one prompt handles every case, skip it.

## Say it back

Try it in one sentence before you read mine:

> Routing is a node that writes a label and a conditional edge that turns the label into the next node's name, so only the right specialist runs.

## What's next

In the playground, ask a question and watch one of three route nodes light up in the drawing. Next lesson: three nodes that run at the same time.

```playground
lg-route
```
````

- [ ] **Step 4: Write `docs/lessons/10-langgraph-parallel.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 4: parallel nodes
Summary: Three edges out of START run three nodes at once; an edge from a list waits for all of them. Plus the one rule that trips everyone up.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

Add several edges out of one node and the targets run **at the same time**. An edge **from a list** of nodes waits for all of them before the next node runs.

LangGraph runs in **steps**. In each step, every node that's ready runs together, then their updates are merged into the state.

## Think of three platforms

At the hub, three trains leave at once on three platforms. They all come back to one junction, and the train out of the junction waits until all three have arrived.

```concepts
Concept | What it is | At the hub
Fan out | Several edges from one node, so the targets run in the same step | Three trains leaving at once
Fan in | An edge from a list of nodes into one node, which waits for all of them | The junction train waiting for every arrival
Step | One round where every ready node runs, then updates are merged | One departure time
Own field | Each parallel node writes a field no other node writes in that step | Each train has its own luggage rack
Reducer | A rule for merging updates to the same field, like adding to a list | A shared bin everyone drops luggage into
```

## Warm-up: a cricket scorecard

The tutorials do this with a batsman's numbers first. Strike rate, balls per boundary and boundary percentage each come from the same runs and balls, so three nodes work them out at once and a summary node joins them. No model needed. Then they do it again with three LLM judges marking an essay.

## Where people get stuck

- Two nodes writing the **same field in the same step** is an error, unless that field has a **reducer**. Give each node its own field, or add a reducer (next lesson).
- The total time is about the **slowest** node, not the sum.
- Only fan out work that's really **independent**. If one node needs another's answer, it's a chain.

## Say it back

Try it in one sentence before you read mine:

> Edges out of one node run the targets together in one step, an edge from a list waits for all of them, and each parallel node writes its own field unless a reducer merges them.

## What's next

In the playground, a review goes to three nodes at once and a plain-code join builds the report. The drawing shows the fan out and the fan in. Next lesson: the model decides how many workers to start.

```playground
lg-parallel
```
````

- [ ] **Step 5: Write `docs/lessons/11-langgraph-orchestrator.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 5: orchestrator-workers with Send
Summary: A planner node writes the subtasks, Send starts one worker per subtask, and a reducer collects their results.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

In lesson 4 you drew every parallel node yourself. Here the model writes the plan at run time, and **`Send`** starts the **same worker node once per subtask**, each with its own input. A **reducer** collects the results.

## Think of a dispatcher

At the depot, a dispatcher reads today's orders and sends out as many vans as there are orders. It's always the same kind of van, each with its own address. When every van is back, one person writes the day's report.

```concepts
Concept | What it is | At the depot
Orchestrator | A node where the model plans the subtasks and writes them into the state | The dispatcher reading the orders
Send | Returned from a conditional edge, it runs a node with its own small input | Sending one van to one address
Worker | One node that `Send` runs once per subtask | The same kind of van, many trips
Reducer | A merge rule on a field, here: add each worker's results to the list | Every van dropping its receipt in one tray
Synthesizer | One node that runs after all workers and combines their results | The person writing the day's report
```

## Where people get stuck

- A worker gets **only what you put in its `Send`**, not the whole state. Pass everything it needs.
- Without a **reducer**, many workers writing `results` in one step is an error. With one, their lists are joined.
- **Cap the plan**. The model might plan ten subtasks, and every worker is a paid call.
- Give the conditional edge the path list `["worker"]`, or the drawing shows lines to every node.

## Say it back

Try it in one sentence before you read mine:

> A planner writes the subtasks, a conditional edge returns one Send per subtask to run the same worker with its own input, and a reducer gathers what they return.

## What's next

In the playground, a goal becomes 2 or 3 subtasks and the drawing shows one worker node that ran several times. Next lesson: a loop that grades its own work.

```playground
lg-orchestrate
```
````

- [ ] **Step 6: Write `docs/lessons/12-langgraph-evaluator.md`**

````markdown
<!--
Topic: LangGraph
Title: LangGraph 6: evaluator-optimizer, a loop with a cap
Summary: A writer node, a grader node, and a conditional edge that loops back on a FAIL. The round counter in the state is what stops it.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

A conditional edge can point **back** to an earlier node. That's a **loop**: write, grade, and on a FAIL write again with the feedback. A **round counter** in the state stops it.

## Think of a circle line with an inspector

The train goes round a circle line. At one station an inspector checks the carriage. Pass, and the train leaves the circle. Fail, and it goes round again with a note on what to fix. After three laps it leaves anyway, so it can't go round forever.

```concepts
Concept | What it is | On the circle line
Optimizer | The node that writes, or rewrites using the feedback | The crew fixing the carriage
Evaluator | The node that grades and writes pass or fail plus feedback into the state | The inspector
Loop | A conditional edge that can return an earlier node's name | The track back round the circle
Cap | A counter in the state the edge checks, so the loop must end | The three-lap limit
```

## Where people get stuck

- **Always cap the loop.** LangGraph has a safety limit on steps, but your own counter should stop it first, with a clear answer.
- Keep the counter **in the state**. A node increments it, the edge reads it.
- The grader needs **clear rules** and must say **why** it failed, or the rewrite has nothing to work with.
- Models miscount words. Check **lengths in code**, not in the grader.
- The tutorials keep a history of every draft with a reducer that adds to a list. Try it: without the reducer, only the last draft survives.

## Say it back

Try it in one sentence before you read mine:

> An evaluator-optimizer graph loops through a conditional edge back to the writer until the grader passes it or the round counter in the state hits the cap.

## What's next

In the playground, describe a product and watch rounds stack up until a PASS. The drawing shows the line from grade back to write. That's the five workflows done as graphs. Next: tools and agents, where the model chooses the steps.

```playground
lg-evaluate
```
````

- [ ] **Step 7: Update the playground id list in `docs/add-blog.md`**

Replace:

```markdown
Today: `greet`, `chain`, `route`, `parallel`, `orchestrate`, `evaluate`. Unknown id → leave it out.
```

with:

```markdown
Today: `greet`, `chain`, `route`, `parallel`, `orchestrate`, `evaluate`, `lg-greet`, `lg-chain`, `lg-route`, `lg-parallel`, `lg-orchestrate`, `lg-evaluate`. Unknown id → leave it out.
```

- [ ] **Step 8: Format and check**

Run: `pnpm format && pnpm lint`
Expected: PASS. Check that every `concepts` line has exactly 3 non-empty cells:

````bash
awk '/```concepts/{f=1;next} /```/{f=0} f && NR>0 {n=gsub(/\|/,"|"); if (n!=2) print FILENAME": "$0}' docs/lessons/0[7-9]-*.md docs/lessons/1[0-2]-*.md
````

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add docs/lessons/07-langgraph-intro.md docs/lessons/08-langgraph-chaining.md docs/lessons/09-langgraph-routing.md docs/lessons/10-langgraph-parallel.md docs/lessons/11-langgraph-orchestrator.md docs/lessons/12-langgraph-evaluator.md docs/add-blog.md
git commit -m "docs: LangGraph lessons 1-6 and their playground ids"
```

---

### Task 7: Docs and end-to-end check

**Files:**

- Modify: `docs/features/F11-learn-langchain.md`
- Modify: `docs/02-decisions.md` (append one row to the decisions table)

- [ ] **Step 1: Add the LangGraph section to F11**

In `docs/features/F11-learn-langchain.md`, add after the "Lessons 2–6" paragraph:

```markdown
**LangGraph lessons 1–6** (the simple call + the same five workflows as `StateGraph`s; design: [spec](../superpowers/specs/2026-11-03-langgraph-notebook-design.md)). Playground ids `lg-greet`, `lg-chain`, `lg-route`, `lg-parallel`, `lg-orchestrate`, `lg-evaluate`, topic "LangGraph". Files: domain `learn/workflow.ts` (`GRAPH_IDS`, `WorkflowRun.graph`), `learn/graph-drawing.ts` (`prepareMermaid`) · application `LearnService.runWorkflow` sends `lg-*` ids to the graph runner · infra `ai/langgraph-workflows.ts` (same prompts and caps as `langchain-workflows.ts`, which exports them) · components `learn/graph-lessons.tsx`, `learn/graph-view.tsx` (Mermaid, loaded on demand, nodes that ran outlined) · content `docs/lessons/07-12`.
```

Add to the **Done when** list:

```markdown
- [ ] All six LangGraph playgrounds return real runs and draw their graph in light and dark (checked locally).
- [ ] LangGraph lessons 1–6 are published on the live site.
```

- [ ] **Step 2: Record the decision**

Append a row to the decisions table in `docs/02-decisions.md`, after the "Lesson post stays one column" row. Keep the table's column layout:

```markdown
| `@langchain/langgraph` for the LangGraph lessons, state as `StateSchema` + `ReducedValue` (Zod), drawn with `mermaid` on the client | `StateSchema` is the main state API in the current LangGraph.js docs and reuses the Zod we already have. The graph runner reuses the LangChain lessons' prompts and helpers, so a lesson only changes the wiring. Mermaid is dynamically imported, so only a run with a graph downloads it. |
```

- [ ] **Step 3: Run the checks**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Check every playground in the browser**

This needs `OPENAI_API_KEY` in `.env.local`, and makes about 20 cheap `gpt-4o-mini` calls.

1. Start the dev server from `.claude/launch.json` (preview tool), or `pnpm dev`.
2. The playground page needs a published note. Locally, create topic "LangGraph" at `/admin/topics`. Then for each of `docs/lessons/07`–`12`: open `/admin/notes/new`, paste the fields and body, and publish. A local DB only; this is not the live site.
3. For each `/blog/<slug>/playground`:
   - The code is on the left.
   - **Run workflow** fills the boxes.
   - The graph appears above the flow, with the nodes that ran outlined in orange.
   - The caption reads `Ran: …`.
4. Run the edge cases:
   - **lg-chain:** retry until a run stops at the gate, or confirm the stop through the unit test.
   - **lg-evaluate:** see at least 2 rounds on a vague idea such as "an app".
5. Toggle dark mode. The graph re-renders with readable labels and visible edges.
6. Open a LangChain playground (e.g. `chain`). It shows no graph and works as before.
7. The browser console has no errors.

- [ ] **Step 5: Commit**

```bash
git add docs/features/F11-learn-langchain.md docs/02-decisions.md
git commit -m "docs: LangGraph lessons in F11 and the decisions log"
```

- [ ] **Step 6: Hand over (the admin publishes)**

Tell the admin:

- Create topic "LangGraph" at `/admin/topics` on the live site.
- Paste and publish `docs/lessons/07`–`12` in order, following `docs/add-blog.md` § 5.
- Claude never publishes.
- Then tick "LangGraph lessons 1–6 are published" in F11.
