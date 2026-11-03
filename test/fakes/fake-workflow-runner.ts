import type { IWorkflowRunner, WorkflowId, WorkflowRun } from "@/domain/learn/workflow";
import type { GenerationError } from "@/domain/shared/errors";
import { err, ok, type Result } from "@/domain/shared/result";

/** Echoes the input back as a one-step run, or fails with a chosen GenerationError. Records every call. */
export class FakeWorkflowRunner implements IWorkflowRunner {
  readonly calls: { id: WorkflowId; input: string }[] = [];
  failWith: GenerationError | null = null;

  async run(id: WorkflowId, input: string): Promise<Result<WorkflowRun, GenerationError>> {
    this.calls.push({ id, input });
    if (this.failWith) return err(this.failWith);
    const usage = { inputTokens: 10, outputTokens: 5 };
    return ok({
      steps: [
        { lane: 0, label: "echo", kind: "llm", messages: [], output: input, usage, latencyMs: 5 },
      ],
      output: input,
      model: "fake-model-1",
      usage,
      latencyMs: 5,
    });
  }
}
