import { platformContentSchemas } from "@/domain/post/post";
import { LINKEDIN_PROMPT } from "../prompts/linkedin.v1";
import { PromptStrategy } from "./prompt-strategy";

export class LinkedInStrategy extends PromptStrategy<"linkedin"> {
  readonly platform = "linkedin";
  readonly schema = platformContentSchemas.linkedin;
  protected readonly prompt = LINKEDIN_PROMPT;
}
