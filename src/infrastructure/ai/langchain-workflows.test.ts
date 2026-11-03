import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkflowId } from "@/domain/learn/workflow";

// Stand-in for ChatOpenAI: a Runnable that answers with `reply(system, user)`, so each test
// can answer per step whatever order parallel calls arrive in.
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

const { LangChainWorkflows } = await import("./langchain-workflows");

const run = async (id: WorkflowId, input: string) => {
  const result = await new LangChainWorkflows("sk-test").run(id, input);
  if (!result.ok) throw result.error;
  return result.value;
};
const runError = async (id: WorkflowId, input: string) => {
  const result = await new LangChainWorkflows("sk-test").run(id, input);
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

describe("LangChainWorkflows", () => {
  afterEach(() => {
    reply = () => "";
    failWith = undefined;
    calls.length = 0;
    vi.restoreAllMocks();
  });

  describe("chain", () => {
    it("writes an outline, passes the gate, then writes the tweet from the outline", async () => {
      let tweetInput = "";
      reply = (system, user) => {
        if (system.includes("outline")) return "- one\n- two\n- three";
        tweetInput = user;
        return "A tweet.";
      };
      const result = await run("chain", "RAG");
      expect(shape(result.steps)).toEqual(["0:outline", "1:gate", "2:tweet"]);
      expect(result.steps[1]?.kind).toBe("code");
      expect(tweetInput).toBe("- one\n- two\n- three");
      expect(result.output).toBe("A tweet.");
      expect(result.usage).toEqual({ inputTokens: 40, outputTokens: 10 });
    });

    it("stops at the gate without calling the model again when the outline is off", async () => {
      reply = () => "- one\n- two";
      const result = await run("chain", "RAG");
      expect(shape(result.steps)).toEqual(["0:outline", "1:gate"]);
      expect(result.steps[1]?.output).toMatch(/got 2/);
      expect(calls).toHaveLength(1);
    });
  });

  describe("route", () => {
    it("classifies the question, then sends it to that route's handler", async () => {
      reply = by({ Classify: "Billing.", billing: "Refund on its way." });
      const result = await run("route", "I was charged twice");
      expect(shape(result.steps)).toEqual(["0:classifier", "1:router", "2:billing handler"]);
      expect(result.output).toBe("Refund on its way.");
    });

    it("fails as invalid_output on a label that is not a route", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = () => "weather";
      expect((await runError("route", "Will it rain?")).kind).toBe("invalid_output");
      expect(calls).toHaveLength(1);
    });
  });

  describe("parallel", () => {
    it("runs three calls in one lane, then joins them in code", async () => {
      reply = by({ "one word": "positive", "one sentence": "Good mug.", "key points": "- warm" });
      const result = await run("parallel", "Great mug, keeps tea hot.");
      expect(shape(result.steps)).toEqual(["0:sentiment", "0:summary", "0:key points", "1:join"]);
      expect(result.output).toBe("Sentiment: positive\nSummary: Good mug.\nKey points:\n- warm");
    });
  });

  describe("orchestrate", () => {
    it("plans subtasks, runs at most 3 workers side by side, then combines them", async () => {
      let synthInput = "";
      reply = (system, user) => {
        if (system.includes("plan work")) return "- a\n- b\n- c\n- d";
        if (system.includes("worker")) return `done ${user.split("Subtask: ")[1]}`;
        synthInput = user;
        return "All done.";
      };
      const result = await run("orchestrate", "Launch a newsletter");
      expect(shape(result.steps)).toEqual([
        "0:orchestrator",
        "1:worker 1",
        "1:worker 2",
        "1:worker 3",
        "2:synthesizer",
      ]);
      expect(synthInput).toContain("done a");
      expect(synthInput).toContain("done c");
      expect(synthInput).not.toContain("done d");
      expect(result.output).toBe("All done.");
    });

    it("fails as invalid_output when the plan has no subtasks", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = () => "Sure! Happy to help.";
      expect((await runError("orchestrate", "Launch a newsletter")).kind).toBe("invalid_output");
    });
  });

  describe("evaluate", () => {
    it("stops at the first passing grade", async () => {
      const grades = ["FAIL: Too generic.", "PASS"];
      let rewriteInput = "";
      reply = (system, user) => {
        if (system.includes("grade")) return grades.shift() ?? "";
        if (user.includes("Feedback")) rewriteInput = user;
        return user.includes("Feedback") ? "Second try." : "First try.";
      };
      const result = await run("evaluate", "A mug that keeps tea hot");
      expect(shape(result.steps)).toEqual([
        "0:writer, round 1",
        "1:grader, round 1",
        "2:writer, round 2",
        "3:grader, round 2",
      ]);
      expect(rewriteInput).toContain("Earlier tagline: First try.");
      expect(rewriteInput).toContain("Feedback: Too generic.");
      expect(result.output).toBe("Second try.");
    });

    it("stops after 3 rounds and keeps the last tagline", async () => {
      reply = (system) => (system.includes("grade") ? "FAIL: Still vague." : "Tagline.");
      const result = await run("evaluate", "A mug");
      expect(result.steps).toHaveLength(7);
      expect(result.steps.at(-1)).toMatchObject({ lane: 6, label: "stop", kind: "code" });
      expect(result.output).toBe("Tagline.");
    });

    it("fails as invalid_output on a grade that is neither PASS nor FAIL", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reply = (system) => (system.includes("grade") ? "Looks fine to me" : "Tagline.");
      expect((await runError("evaluate", "A mug")).kind).toBe("invalid_output");
    });
  });

  it("keeps braces in the input literal", async () => {
    let seen = "";
    reply = (_, user) => ((seen = user), "general");
    await run("route", "What does {name} mean?");
    expect(seen).toBe("What does {name} mean?");
  });

  it("maps a 429 to rate_limit without leaking provider text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failWith = Object.assign(new Error("429 secret detail"), { status: 429 });
    const error = await runError("chain", "RAG");
    expect(error.kind).toBe("rate_limit");
    expect(error.message).not.toContain("secret");
  });

  it("fails without calling the model when the key is missing", async () => {
    const result = await new LangChainWorkflows(undefined).run("chain", "RAG");
    expect(!result.ok && result.error.kind).toBe("provider");
    expect(calls).toHaveLength(0);
  });
});
