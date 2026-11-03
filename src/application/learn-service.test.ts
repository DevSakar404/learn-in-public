import { describe, expect, it } from "vitest";
import { GenerationError } from "@/domain/shared/errors";
import { FakeGreeter } from "../../test/fakes/fake-greeter";
import { FakeWorkflowRunner } from "../../test/fakes/fake-workflow-runner";
import { FixedClock } from "../../test/fakes/fixed-clock";
import { greetSchema, LearnService, workflowSchema } from "./learn-service";
import { RateLimiter } from "./rate-limiter";

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
const input = (name: string, website = "") => greetSchema.parse({ name, website });

describe("greetSchema", () => {
  it("trims the name and rejects empty or over-long names", () => {
    expect(greetSchema.parse({ name: "  Sam " }).name).toBe("Sam");
    expect(greetSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(greetSchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
    expect(greetSchema.safeParse({ name: "x".repeat(40) }).success).toBe(true);
  });
});

describe("LearnService.greet", () => {
  it("passes the name to the greeter", async () => {
    const { greeter, service } = make();
    const result = await service.greet("ip", input("Sam"));
    expect(result.ok && result.value.greeting).toBe("Hello, Sam!");
    expect(greeter.names).toEqual(["Sam"]);
  });

  it("returns the greeter's error", async () => {
    const { greeter, service } = make();
    greeter.failWith = new GenerationError("timeout", "slow");
    const result = await service.greet("ip", input("Sam"));
    expect(!result.ok && result.error.kind).toBe("timeout");
  });

  it("blocks over the limit without calling the model", async () => {
    const { greeter, service } = make(1);
    await service.greet("ip", input("Sam"));
    const blocked = await service.greet("ip", input("Sam"));
    expect(!blocked.ok && blocked.error.kind).toBe("rate_limit");
    expect(greeter.names).toHaveLength(1);
  });

  it("never calls the model for bots that fill the honeypot", async () => {
    const { greeter, service } = make();
    const result = await service.greet("ip", input("Sam", "spam.example"));
    expect(result.ok).toBe(false);
    expect(greeter.names).toHaveLength(0);
  });
});

const run = (input: string, website = "") => workflowSchema.parse({ id: "route", input, website });

describe("workflowSchema", () => {
  it("trims the input, keeps it to 200 characters and only takes known workflows", () => {
    expect(run("  Where is my invoice? ").input).toBe("Where is my invoice?");
    expect(workflowSchema.safeParse({ id: "route", input: "  " }).success).toBe(false);
    expect(workflowSchema.safeParse({ id: "route", input: "x".repeat(201) }).success).toBe(false);
    expect(workflowSchema.safeParse({ id: "route", input: "x".repeat(200) }).success).toBe(true);
    expect(workflowSchema.safeParse({ id: "agent", input: "hi" }).success).toBe(false);
  });

  it("takes the LangGraph lesson ids too", () => {
    expect(workflowSchema.safeParse({ id: "lg-chain", input: "hi" }).success).toBe(true);
    expect(workflowSchema.safeParse({ id: "lg-agent", input: "hi" }).success).toBe(false);
  });
});

describe("LearnService.runWorkflow", () => {
  it("passes the workflow id and input to the runner", async () => {
    const { workflows, service } = make();
    const result = await service.runWorkflow("ip", run("Where is my invoice?"));
    expect(result.ok && result.value.output).toBe("Where is my invoice?");
    expect(workflows.calls).toEqual([{ id: "route", input: "Where is my invoice?" }]);
  });

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

  it("returns the runner's error", async () => {
    const { workflows, service } = make();
    workflows.failWith = new GenerationError("invalid_output", "unreadable");
    const result = await service.runWorkflow("ip", run("hi"));
    expect(!result.ok && result.error.kind).toBe("invalid_output");
  });

  it("shares the limit with the greet lesson", async () => {
    const { workflows, service } = make(1);
    await service.greet("ip", input("Sam"));
    const blocked = await service.runWorkflow("ip", run("hi"));
    expect(!blocked.ok && blocked.error.kind).toBe("rate_limit");
    expect(workflows.calls).toHaveLength(0);
  });

  it("never calls the model for bots that fill the honeypot", async () => {
    const { workflows, service } = make();
    const result = await service.runWorkflow("ip", run("hi", "spam.example"));
    expect(result.ok).toBe(false);
    expect(workflows.calls).toHaveLength(0);
  });
});
