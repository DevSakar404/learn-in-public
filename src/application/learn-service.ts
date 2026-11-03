import { z } from "zod";
import type { Greeting, IGreeter } from "@/domain/learn/greeter";
import { WORKFLOW_IDS, type IWorkflowRunner, type WorkflowRun } from "@/domain/learn/workflow";
import { GenerationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";
import type { RateLimiter } from "./rate-limiter";

/** Honeypot: hidden from people, filled in by bots. */
const honeypot = z.string().default("");

export const greetSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(40, "Keep it to 40 characters"),
  website: honeypot,
});
export type GreetInput = z.output<typeof greetSchema>;

export const workflowSchema = z.object({
  id: z.enum(WORKFLOW_IDS),
  input: z.string().trim().min(1, "Type something to run").max(200, "Keep it to 200 characters"),
  website: honeypot,
});
export type WorkflowInput = z.output<typeof workflowSchema>;

/** Runs the public lesson playgrounds. Every run is a paid model call, so each one is rate limited. */
export class LearnService {
  constructor(
    private readonly greeter: IGreeter,
    private readonly workflows: IWorkflowRunner,
    private readonly limiter: RateLimiter,
  ) {}

  async greet(clientKey: string, input: GreetInput): Promise<Result<Greeting, GenerationError>> {
    return this.blocked(clientKey, input.website) ?? this.greeter.greet(input.name);
  }

  async runWorkflow(
    clientKey: string,
    input: WorkflowInput,
  ): Promise<Result<WorkflowRun, GenerationError>> {
    return this.blocked(clientKey, input.website) ?? this.workflows.run(input.id, input.input);
  }

  /** Bots and readers over the limit get the same answer, and no model call. */
  private blocked(clientKey: string, website: string) {
    if (website === "" && this.limiter.take(clientKey)) return null;
    return err(
      new GenerationError("rate_limit", "You've run the demo a lot. Wait a minute and try again."),
    );
  }
}
