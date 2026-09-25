import type { PlatformPayload } from "./post";

export type SlideKind = "cover" | "content" | "closing";

export interface Slide {
  kind: SlideKind;
  title: string;
  body: string;
}

export interface SlideDeck {
  width: number;
  height: number;
  slides: Slide[];
}

/** The images a draft turns into. Null for platforms without images. */
export function slideDeck(draft: PlatformPayload): SlideDeck | null {
  switch (draft.platform) {
    case "instagram": {
      const last = draft.content.slides.length - 1;
      return {
        width: 1080, // Instagram portrait 4:5
        height: 1350,
        slides: draft.content.slides.map((s, i) => ({
          kind: i === 0 ? "cover" : i === last ? "closing" : "content",
          title: s.title,
          body: s.body,
        })),
      };
    }
    case "linkedin":
      return {
        width: 1200, // square works in the LinkedIn feed on mobile and desktop
        height: 1200,
        slides: [{ kind: "cover", title: draft.content.hook, body: draft.content.question }],
      };
    default:
      return null;
  }
}
