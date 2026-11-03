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
    output: run.graph.ran.includes("writeTweet")
      ? run.state.tweet
      : `The gate stopped the chain: it wanted 3 bullets and got ${points}, so writeTweet never ran.`,
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
