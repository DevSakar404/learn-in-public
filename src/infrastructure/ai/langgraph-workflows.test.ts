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

    it("does not blame the gate when the gate passed but the tweet came back empty", async () => {
      reply = (system) => (system.includes("outline") ? "- one\n- two\n- three" : "");
      const result = await run("lg-chain", "RAG");
      expect(result.graph?.ran).toEqual(["writeOutline", "writeTweet"]);
      expect(result.output).not.toMatch(/gate stopped/);
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
