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
