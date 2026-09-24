import type { PlatformPayload } from "./post";

/** Plain text ready to paste into the platform (the Copy button). */
export function toPlainText(draft: PlatformPayload): string {
  switch (draft.platform) {
    case "x":
      return [draft.content.post, ...draft.content.thread].join("\n\n---\n\n");
    case "linkedin":
      return [draft.content.hook, draft.content.body, draft.content.question].join("\n\n");
    case "instagram": {
      const { slides, caption, hashtags } = draft.content;
      const text = slides.map((s, n) => `Slide ${n + 1}: ${s.title}\n${s.body}`);
      return [...text, `Caption:\n${caption}`, hashtags.join(" ")].join("\n\n");
    }
    case "youtube": {
      const { titleOptions, outline, description } = draft.content;
      return [
        `Title options:\n${titleOptions.map((t) => `- ${t}`).join("\n")}`,
        `Outline:\n${outline.map((b, n) => `${n + 1}. ${b}`).join("\n")}`,
        `Description:\n${description}`,
      ].join("\n\n");
    }
  }
}
