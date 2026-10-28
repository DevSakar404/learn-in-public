import { z } from "zod";
import type { Greeting, IGreeter } from "@/domain/learn/greeter";
import { GenerationError } from "@/domain/shared/errors";
import { err, type Result } from "@/domain/shared/result";
import type { RateLimiter } from "./rate-limiter";

export const greetSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(40, "Keep it to 40 characters"),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().default(""),
});
export type GreetInput = z.output<typeof greetSchema>;

/** Runs the public lesson playgrounds. Every run is a paid model call, so each one is rate limited. */
export class LearnService {
  constructor(
    private readonly greeter: IGreeter,
    private readonly limiter: RateLimiter,
  ) {}

  async greet(clientKey: string, input: GreetInput): Promise<Result<Greeting, GenerationError>> {
    if (input.website !== "" || !this.limiter.take(clientKey)) {
      return err(
        new GenerationError(
          "rate_limit",
          "You've run the demo a lot. Wait a minute and try again.",
        ),
      );
    }
    return this.greeter.greet(input.name);
  }
}
