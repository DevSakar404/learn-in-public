import { platformContentSchemas } from "@/domain/post/post";
import { YOUTUBE_PROMPT } from "../prompts/youtube.v1";
import { PromptStrategy } from "./prompt-strategy";

export class YouTubeScriptStrategy extends PromptStrategy<"youtube"> {
  readonly platform = "youtube";
  readonly schema = platformContentSchemas.youtube;
  protected readonly prompt = YOUTUBE_PROMPT;
}
