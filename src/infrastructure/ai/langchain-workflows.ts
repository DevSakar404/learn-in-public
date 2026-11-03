import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type {
  IWorkflowRunner,
  WorkflowId,
  WorkflowRun,
  WorkflowStep,
} from "@/domain/learn/workflow";
import { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";
import { toPublicGenerationError } from "./error-mapping";

// The LLM workflow lessons (docs/lessons/02-06) teach the code in this file.
export const WORKFLOW_MODEL = "gpt-4o-mini";

/** The model gave an answer the next step can't use. */
class UnreadableOutput extends Error {}

interface Asked {
  text: string;
  step: WorkflowStep;
}
interface Flow {
  steps: WorkflowStep[];
  output: string;
}

/** One model call (our system prompt + the reader's text), recorded as a step in `lane`. */
async function ask(
  model: ChatOpenAI,
  lane: number,
  label: string,
  system: string,
  input: string,
): Promise<Asked> {
  const started = Date.now();
  // The input goes in through a variable, so braces the reader types stay literal.
  const messages = await ChatPromptTemplate.fromMessages([
    ["system", system],
    ["human", "{input}"],
  ]).formatMessages({ input });
  const reply = await model.invoke(messages);
  const text = reply.text.trim();
  return {
    text,
    step: {
      lane,
      label,
      kind: "llm",
      messages: messages.map((m) => ({
        role: m.type === "system" ? "system" : "user",
        content: m.text,
      })),
      output: text,
      usage: {
        inputTokens: reply.usage_metadata?.input_tokens ?? 0,
        outputTokens: reply.usage_metadata?.output_tokens ?? 0,
      },
      latencyMs: Date.now() - started,
    },
  };
}

/** A step done in plain code, not by the model. */
const code = (lane: number, label: string, output: string): WorkflowStep => ({
  lane,
  label,
  kind: "code",
  messages: [],
  output,
  usage: { inputTokens: 0, outputTokens: 0 },
  latencyMs: 0,
});

/** The lines of a "- " list, without the dashes. */
const bullets = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, ""));

/** Prompt chaining: outline → gate (plain code) → tweet. */
export async function promptChaining(model: ChatOpenAI, topic: string): Promise<Flow> {
  const outline = await ask(
    model,
    0,
    "outline",
    'Write an outline for a short post on the user\'s topic. Reply with exactly 3 lines, each starting with "- ". No other text.',
    topic,
  );
  const points = bullets(outline.text).length;
  if (points !== 3) {
    return {
      steps: [outline.step, code(1, "gate", `Stopped: wanted 3 bullets, got ${points}.`)],
      output: "The gate stopped the chain, so the tweet step never ran.",
    };
  }
  const tweet = await ask(
    model,
    2,
    "tweet",
    "Turn these bullet points into one tweet under 280 characters. No hashtags. Reply with the tweet only.",
    outline.text,
  );
  return {
    steps: [outline.step, code(1, "gate", "Passed: 3 bullets."), tweet.step],
    output: tweet.text,
  };
}

const ROUTES = ["billing", "technical", "general"] as const;
const HANDLERS: Record<(typeof ROUTES)[number], string> = {
  billing:
    "You are a billing specialist for an online shop. Answer the customer in 2 or 3 sentences: explain charges, refunds and invoices, and say what to do next.",
  technical:
    "You are a technical support engineer for an online shop's app. Answer the customer in 2 or 3 sentences with clear troubleshooting steps.",
  general:
    "You are a friendly support agent for an online shop. Answer the customer in 2 or 3 sentences.",
};

/** Routing: classify the question, then hand it to that route's handler. */
export async function routing(model: ChatOpenAI, question: string): Promise<Flow> {
  const label = await ask(
    model,
    0,
    "classifier",
    "Classify the customer message. Reply with one word: billing, technical or general.",
    question,
  );
  const route = z.enum(ROUTES).safeParse(label.text.toLowerCase().replace(/[^a-z]/g, ""));
  if (!route.success) throw new UnreadableOutput(`route: ${label.text}`);
  const answer = await ask(model, 2, `${route.data} handler`, HANDLERS[route.data], question);
  return {
    steps: [label.step, code(1, "router", `Sent to the ${route.data} handler.`), answer.step],
    output: answer.text,
  };
}

/** Parallelization (sectioning): three independent calls at once, joined in code. */
export async function parallelization(model: ChatOpenAI, review: string): Promise<Flow> {
  const [sentiment, summary, points] = await Promise.all([
    ask(
      model,
      0,
      "sentiment",
      "Read the product review. Reply with one word: positive, negative or mixed.",
      review,
    ),
    ask(model, 0, "summary", "Summarise the product review in one sentence.", review),
    ask(
      model,
      0,
      "key points",
      'List the review\'s key points: at most 3 lines, each starting with "- ". No other text.',
      review,
    ),
  ]);
  const report = `Sentiment: ${sentiment.text}\nSummary: ${summary.text}\nKey points:\n${points.text}`;
  return {
    steps: [sentiment.step, summary.step, points.step, code(1, "join", report)],
    output: report,
  };
}

/** At most this many workers per run: the model may plan more, and every worker is a paid call. */
const MAX_WORKERS = 3;

/** Orchestrator-workers: the model plans the subtasks, workers do them at once, one call combines. */
export async function orchestratorWorkers(model: ChatOpenAI, goal: string): Promise<Flow> {
  const plan = await ask(
    model,
    0,
    "orchestrator",
    'You plan work. Break the user\'s goal into 2 or 3 independent subtasks. Reply with one subtask per line, each starting with "- ". No other text.',
    goal,
  );
  const parsed = z.array(z.string().min(1)).min(1).safeParse(bullets(plan.text));
  if (!parsed.success) throw new UnreadableOutput(`plan: ${plan.text}`);
  const subtasks = parsed.data.slice(0, MAX_WORKERS);

  const workers = await Promise.all(
    subtasks.map((task, i) =>
      ask(
        model,
        1,
        `worker ${i + 1}`,
        "You are a worker. Do only the subtask you are given, for the goal you are given, in 2 or 3 sentences.",
        `Goal: ${goal}\nSubtask: ${task}`,
      ),
    ),
  );
  const results = workers.map((w, i) => `Result ${i + 1} (${subtasks[i]}):\n${w.text}`);
  const answer = await ask(
    model,
    2,
    "synthesizer",
    "Combine the results below into one short, clear answer to the goal.",
    `Goal: ${goal}\n\n${results.join("\n\n")}`,
  );
  return { steps: [plan.step, ...workers.map((w) => w.step), answer.step], output: answer.text };
}

/** Writer + grader rounds before we stop and keep the last tagline. */
const MAX_ROUNDS = 3;

/** "PASS" or "FAIL: <feedback>". Anything else can't drive the next round. */
function readGrade(text: string): { pass: boolean; feedback: string } {
  const match = /^\W*(PASS|FAIL)\b\W*(.*)$/is.exec(text);
  if (!match?.[1]) throw new UnreadableOutput(`grade: ${text}`);
  return { pass: match[1].toUpperCase() === "PASS", feedback: (match[2] ?? "").trim() };
}

/** Evaluator-optimizer: write, grade, rewrite with the feedback, until a pass or MAX_ROUNDS. */
export async function evaluatorOptimizer(model: ChatOpenAI, idea: string): Promise<Flow> {
  const steps: WorkflowStep[] = [];
  let tagline = "";
  let feedback = "";
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const draft = await ask(
      model,
      steps.length,
      `writer, round ${round}`,
      "Write one tagline, under 12 words, for the product idea. If you get feedback on an earlier tagline, fix what it points out. Reply with the tagline only.",
      round === 1
        ? idea
        : `Product idea: ${idea}\nEarlier tagline: ${tagline}\nFeedback: ${feedback}`,
    );
    tagline = draft.text;
    const verdict = await ask(
      model,
      steps.length + 1,
      `grader, round ${round}`,
      'You grade product taglines. Pass only if it names what makes this product different and is free of cliches. Reply "PASS", or "FAIL: " followed by one sentence of feedback.',
      `Product idea: ${idea}\nTagline: ${tagline}`,
    );
    steps.push(draft.step, verdict.step);
    const grade = readGrade(verdict.text);
    if (grade.pass) return { steps, output: tagline };
    feedback = grade.feedback;
  }
  steps.push(
    code(steps.length, "stop", `No pass after ${MAX_ROUNDS} rounds. Kept the last tagline.`),
  );
  return { steps, output: tagline };
}

const WORKFLOWS: Record<WorkflowId, (model: ChatOpenAI, input: string) => Promise<Flow>> = {
  chain: promptChaining,
  route: routing,
  parallel: parallelization,
  orchestrate: orchestratorWorkers,
  evaluate: evaluatorOptimizer,
};

export class LangChainWorkflows implements IWorkflowRunner {
  private model: ChatOpenAI | undefined;

  constructor(private readonly apiKey: string | undefined) {}

  async run(id: WorkflowId, input: string): Promise<Result<WorkflowRun, GenerationError>> {
    if (!this.apiKey) {
      return err(
        new GenerationError("provider", "This demo isn't switched on yet. Check back soon."),
      );
    }
    this.model ??= new ChatOpenAI({
      model: WORKFLOW_MODEL,
      apiKey: this.apiKey,
      maxTokens: 200,
      timeout: 15_000,
      maxRetries: 0,
    });

    const started = Date.now();
    try {
      const { steps, output } = await WORKFLOWS[id](this.model, input);
      const usage = { inputTokens: 0, outputTokens: 0 };
      for (const step of steps) {
        usage.inputTokens += step.usage.inputTokens;
        usage.outputTokens += step.usage.outputTokens;
      }
      return ok({ steps, output, model: WORKFLOW_MODEL, usage, latencyMs: Date.now() - started });
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
}
