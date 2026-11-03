import type { GenerationError } from "@/domain/shared/errors";
import type { Result } from "@/domain/shared/result";
import type { SentMessage } from "./greeter";

/** The five LLM workflow lessons, by playground id. */
export const WORKFLOW_IDS = ["chain", "route", "parallel", "orchestrate", "evaluate"] as const;
export type WorkflowId = (typeof WORKFLOW_IDS)[number];

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
}

/** Runs one workflow lesson end to end with real model calls. */
export interface IWorkflowRunner {
  run(id: WorkflowId, input: string): Promise<Result<WorkflowRun, GenerationError>>;
}
