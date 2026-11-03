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
