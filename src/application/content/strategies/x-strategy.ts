import { platformContentSchemas } from "@/domain/post/post";
import { X_PROMPT } from "../prompts/x.v1";
import { PromptStrategy } from "./prompt-strategy";

export class XStrategy extends PromptStrategy<"x"> {
  readonly platform = "x";
  readonly schema = platformContentSchemas.x;
  protected readonly prompt = X_PROMPT;
}
