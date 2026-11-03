import { afterEach, describe, expect, it, vi } from "vitest";

// Stand-in for ChatOpenAI: a Runnable (so prompt.pipe() works) that replies with `next`.
const next: { reply?: string; error?: unknown } = {};
const seen: unknown[] = [];
vi.mock("@langchain/openai", async () => {
  const { RunnableLambda } = await import("@langchain/core/runnables");
  const { AIMessage } = await import("@langchain/core/messages");
  return {
    ChatOpenAI: class extends RunnableLambda<unknown, InstanceType<typeof AIMessage>> {
      constructor() {
        super({
          func: async (input: unknown) => {
            seen.push(input);
            if (next.error) throw next.error;
            return new AIMessage({
              content: next.reply ?? "",
              usage_metadata: { input_tokens: 30, output_tokens: 9, total_tokens: 39 },
            });
          },
        });
      }
    },
  };
});

const { LangChainGreeter } = await import("./langchain-greeter");

describe("LangChainGreeter", () => {
  afterEach(() => {
    next.reply = undefined;
    next.error = undefined;
    seen.length = 0;
  });

  it("returns the greeting, the messages sent, and token usage", async () => {
    next.reply = "Hey Sam, welcome!";
    const result = await new LangChainGreeter("sk-test").greet("Sam");
    if (!result.ok) throw result.error;
    expect(result.value).toMatchObject({
      greeting: "Hey Sam, welcome!",
      model: "gpt-4o-mini",
      usage: { inputTokens: 30, outputTokens: 9 },
    });
    expect(result.value.messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(result.value.messages[1]?.content).toBe("Hi, my name is Sam.");
    expect(seen).toHaveLength(1);
  });

  it("maps a 429 to rate_limit without leaking provider text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    next.error = Object.assign(new Error("429 secret detail"), { status: 429 });
    const result = await new LangChainGreeter("sk-test").greet("Sam");
    expect(!result.ok && result.error.kind).toBe("rate_limit");
    expect(!result.ok && result.error.message).not.toContain("secret");
  });

  it("fails without calling the model when the key is missing", async () => {
    const result = await new LangChainGreeter(undefined).greet("Sam");
    expect(!result.ok && result.error.kind).toBe("provider");
    expect(seen).toHaveLength(0);
  });
});
