import { platformContentSchemas } from "@/domain/post/post";
import { INSTAGRAM_PROMPT } from "../prompts/instagram.v1";
import { PromptStrategy } from "./prompt-strategy";

export class InstagramCarouselStrategy extends PromptStrategy<"instagram"> {
  readonly platform = "instagram";
  readonly schema = platformContentSchemas.instagram;
  protected readonly prompt = INSTAGRAM_PROMPT;
}
