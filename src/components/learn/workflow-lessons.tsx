import type { Lesson } from "@/components/learn/lesson-playground";
import {
  WorkflowPlayground,
  type WorkflowPlaygroundProps,
} from "@/components/learn/workflow-playground";
import type { PlainWorkflowId, WorkflowId } from "@/domain/learn/workflow";

// Teaching copies of the five workflows (src/infrastructure/ai/langchain-workflows.ts runs the real ones).
// Escapes: \${ and \\n show up as ${ and \n in the code the reader sees.

/** Every lesson's code starts with this: the model and a one-call helper (lesson 1's node). */
const ASK = `import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", maxTokens: 200 });

// One LLM call: our instructions (system) + the user's text (human).
// It's lesson 1's node, as a helper we can call many times.
async function ask(system: string, input: string) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", system],
    ["human", "{input}"],
  ]);
  const reply = await prompt.pipe(model).invoke({ input });
  return reply.text.trim();
}`;

const CHAIN_CODE = `${ASK}

// Prompt chaining: each step works on the step before's output.
export async function promptChain(topic: string) {
  // Step 1: one call writes the outline.
  const outline = await ask(
    'Outline a short post on the topic. Exactly 3 lines, each starting with "- ".',
    topic,
  );

  // The gate: plain code, no model. It checks step 1 before we pay for step 2.
  const bullets = outline.split("\\n").filter((line) => line.startsWith("- "));
  if (bullets.length !== 3) return { stoppedAt: "gate", outline };

  // Step 2: the input is the outline, not the user's topic.
  const tweet = await ask("Turn these bullet points into one tweet. No hashtags.", outline);
  return { outline, tweet };
}`;

const ROUTE_CODE = `${ASK}

// One set of instructions per route, each tuned for one kind of question.
const handlers = {
  billing: "You are a billing specialist. Explain charges and refunds.",
  technical: "You are a support engineer. Give clear troubleshooting steps.",
  general: "You are a friendly support agent.",
};

// Routing: a first call picks the route, a second call answers.
export async function route(question: string) {
  // Step 1: a small call that only picks a label.
  const label = await ask(
    "Classify the customer message. Reply with one word: billing, technical or general.",
    question,
  );

  // The router: plain code. Check the label before you trust it.
  const key = label.toLowerCase().replace(/[^a-z]/g, "");
  if (!(key in handlers)) throw new Error(\`Unknown route: \${label}\`);

  // Step 2: the question goes to that route's handler.
  const answer = await ask(handlers[key as keyof typeof handlers], question);
  return { route: key, answer };
}`;

const PARALLEL_CODE = `${ASK}

// Parallelization: calls that don't need each other run at the same time.
export async function analyseReview(review: string) {
  // Promise.all starts all three calls at once and waits for the last one.
  const [sentiment, summary, keyPoints] = await Promise.all([
    ask("Reply with one word: positive, negative or mixed.", review),
    ask("Summarise the product review in one sentence.", review),
    ask('List at most 3 key points, each starting with "- ".', review),
  ]);

  // The join: plain code puts the three answers together.
  return \`Sentiment: \${sentiment}\\nSummary: \${summary}\\nKey points:\\n\${keyPoints}\`;
}`;

const ORCHESTRATE_CODE = `${ASK}

// Orchestrator-workers: the model decides the subtasks, then workers do them.
export async function orchestrate(goal: string) {
  // The orchestrator: one call plans the work.
  const plan = await ask(
    'Break the goal into 2 or 3 independent subtasks. One per line, each starting with "- ".',
    goal,
  );
  const subtasks = plan
    .split("\\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2))
    .slice(0, 3); // cap the cost: at most 3 workers

  // The workers: one call per subtask, all at once.
  const results = await Promise.all(
    subtasks.map((task) =>
      ask("Do only this subtask, in 2 or 3 sentences.", \`Goal: \${goal}\\nSubtask: \${task}\`),
    ),
  );

  // The synthesizer: one last call combines the results.
  return ask(
    "Combine the results into one short, clear answer to the goal.",
    \`Goal: \${goal}\\n\\n\${results.join("\\n\\n")}\`,
  );
}`;

const EVALUATE_CODE = `${ASK}

// Evaluator-optimizer: one call writes, another grades, repeat with the feedback.
export async function writeTagline(idea: string) {
  let tagline = "";
  let feedback = "";

  // Stop on a pass, or after 3 rounds. Without a cap, a loop can run (and cost) forever.
  for (let round = 1; round <= 3; round++) {
    // The optimizer: writes, or rewrites using the feedback.
    tagline = await ask(
      "Write one tagline under 12 words. If you get feedback, fix what it points out.",
      round === 1
        ? idea
        : \`Idea: \${idea}\\nEarlier tagline: \${tagline}\\nFeedback: \${feedback}\`,
    );

    // The evaluator: grades against clear rules and says why it failed.
    const grade = await ask(
      // Only rules a model judges well. Models miscount words, so a length rule belongs in code.
      'Grade the tagline: says what makes the product different, no cliches. Reply "PASS" or "FAIL: <why>".',
      \`Idea: \${idea}\\nTagline: \${tagline}\`,
    );
    if (grade.startsWith("PASS")) return { tagline, rounds: round };
    feedback = grade.replace(/^FAIL:\\s*/, "");
  }
  return { tagline, rounds: 3, passed: false };
}`;

export const C = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono text-[0.85em] text-ember-text">{children}</code>
);

const ASK_MATCH = (
  <li>
    <C>ask</C> is lesson 1&apos;s node as a helper: a system message with our instructions, a human
    message with the text, one call to <C>gpt-4o-mini</C>.
  </li>
);

export const llm = (label: string) => ({ label, kind: "llm" as const });
export const code = (label: string) => ({ label, kind: "code" as const });

export type Playground = Omit<WorkflowPlaygroundProps, "id">;

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

/** The five workflow lessons, by playground id. Spread into LESSONS. */
export const WORKFLOW_LESSONS: Record<PlainWorkflowId, Lesson> = Object.fromEntries([
  lesson(
    "chain",
    "prompt-chain.ts",
    CHAIN_CODE,
    {
      field: {
        label: "A topic (the input to step 1)",
        placeholder: "e.g. Why RAG needs good chunking",
      },
      shape: [[llm("outline")], [code("gate")], [llm("tweet")]],
    },
    <>
      <li>
        <strong>Step 1</strong> asks for an outline in a strict format: exactly 3 lines starting
        with <C>- </C>. A strict format makes the gate easy to write.
      </li>
      <li>
        <strong>The gate</strong> is two lines of plain code. If the outline is off, the function
        returns early and step 2 never runs. No wasted call.
      </li>
      <li>
        <strong>Step 2</strong> gets <C>outline</C> as its input. That hand-off is the chain.
      </li>
    </>,
    <>
      <p>
        Type a topic and press <strong>Run workflow</strong>:
      </p>
      <ol>
        <li>The outline call runs. Its box fills with three bullets.</li>
        <li>The gate counts them. A dashed box means plain code: no model, no tokens, no time.</li>
        <li>The tweet call runs with the outline as its input.</li>
      </ol>
      <p>
        Open <strong>Sent to the model</strong> on the tweet box: the human message is the outline,
        not your topic.
      </p>
    </>,
  ),
  lesson(
    "route",
    "route.ts",
    ROUTE_CODE,
    {
      field: {
        label: "A customer question",
        placeholder: "e.g. I was charged twice for one order",
      },
      shape: [[llm("classifier")], [code("router")], [llm("handler")]],
    },
    <>
      <li>
        <C>handlers</C> holds one set of instructions per route. Each is short and does one job
        well.
      </li>
      <li>
        <strong>The classifier</strong> only picks a label. One word back is cheap and easy to
        check.
      </li>
      <li>
        <strong>The router</strong> cleans the label and checks it is a real route. Models sometimes
        answer &quot;Billing.&quot; or something off the list.
      </li>
      <li>
        <strong>The handler</strong> answers with the instructions for that route.
      </li>
    </>,
    <>
      <p>Ask a question, then try one from a different route:</p>
      <ol>
        <li>The classifier box shows the one word it picked.</li>
        <li>The router box says which handler got the question.</li>
        <li>
          The handler answers. Open <strong>Sent to the model</strong> to see the system message
          change from route to route.
        </li>
      </ol>
      <p>
        Try something vague, like &quot;hello&quot;. It should land on <C>general</C>.
      </p>
    </>,
  ),
  lesson(
    "parallel",
    "analyse-review.ts",
    PARALLEL_CODE,
    {
      field: {
        label: "A product review",
        placeholder: "e.g. Keeps tea hot for hours, but the lid leaks",
      },
      shape: [[llm("sentiment"), llm("summary"), llm("key points")], [code("join")]],
    },
    <>
      <li>
        The three calls each read only the review. None needs another&apos;s answer, so they can run
        together.
      </li>
      <li>
        <C>Promise.all</C> starts all three at once and waits until the last one is back. Total time
        ≈ the slowest call, not the sum.
      </li>
      <li>
        <strong>The join</strong> is plain code that puts the answers into one report.
      </li>
    </>,
    <>
      <p>Paste a review and run it:</p>
      <ol>
        <li>Three boxes side by side: the three calls run at the same time.</li>
        <li>
          Compare each box&apos;s time with the total at the top. The total is close to the slowest
          one.
        </li>
        <li>The join box builds the report you see at the end.</li>
      </ol>
    </>,
  ),
  lesson(
    "orchestrate",
    "orchestrate.ts",
    ORCHESTRATE_CODE,
    {
      field: { label: "A goal", placeholder: "e.g. Launch a weekly newsletter about AI tools" },
      shape: [
        [llm("orchestrator")],
        [llm("worker 1"), llm("worker 2"), llm("worker 3")],
        [llm("synthesizer")],
      ],
      note: "The orchestrator decides how many workers run: 2 or 3.",
    },
    <>
      <li>
        <strong>The orchestrator</strong> plans: the model writes the list of subtasks. Your code
        doesn&apos;t know them in advance.
      </li>
      <li>
        <C>.slice(0, 3)</C> caps the workers. The model might plan ten, and each one is a paid call.
      </li>
      <li>
        <strong>The workers</strong> run with <C>Promise.all</C>, like lesson 4. Each gets the goal
        and one subtask.
      </li>
      <li>
        <strong>The synthesizer</strong> turns the separate results into one answer.
      </li>
    </>,
    <>
      <p>Type a goal and run it:</p>
      <ol>
        <li>The orchestrator box shows the plan it wrote.</li>
        <li>One worker box per subtask, side by side. Try another goal: the subtasks change.</li>
        <li>The synthesizer combines them. Its human message holds every worker&apos;s result.</li>
      </ol>
    </>,
  ),
  lesson(
    "evaluate",
    "write-tagline.ts",
    EVALUATE_CODE,
    {
      field: {
        label: "A product idea",
        placeholder: "e.g. A mug that keeps tea at the right temperature",
      },
      shape: [[llm("writer")], [llm("grader")]],
      note: "If the grader says FAIL, the writer tries again with its feedback: up to 3 rounds.",
    },
    <>
      <li>
        <strong>The optimizer</strong> writes a tagline. From round 2 on, it also gets its earlier
        tagline and the grader&apos;s feedback.
      </li>
      <li>
        <strong>The evaluator</strong> grades against clear rules and must say why it failed. Clear
        rules make the feedback useful.
      </li>
      <li>
        The <C>for</C> loop stops on a pass or after 3 rounds, so a picky grader can&apos;t run up
        the bill.
      </li>
    </>,
    <>
      <p>Describe a product and run it:</p>
      <ol>
        <li>The writer box shows the first tagline.</li>
        <li>The grader box shows PASS, or FAIL with a reason.</li>
        <li>
          On a FAIL, a new round starts. Open the round 2 writer&apos;s{" "}
          <strong>Sent to the model</strong>: the feedback is in its message.
        </li>
        <li>After 3 FAILs, a dashed stop box keeps the last tagline.</li>
      </ol>
    </>,
  ),
]) as Record<PlainWorkflowId, Lesson>;
