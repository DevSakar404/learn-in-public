// Adapted from agency-agents `marketing-instagram-curator.md` (educational content, strong CTA) and the
// carousel template in `marketing-linkedin-content-creator.md` (slide 1 = hook, one insight per slide).
export const INSTAGRAM_PROMPT = {
  version: "instagram.v1",
  instructions: `Platform: Instagram carousel (text only; slides will be designed later).

Write
- "slides": 6 to 8 slides. Each has a "title" (max ~8 words) and a "body" (1–3 short sentences, max 220 characters).
  - Slide 1: the hook. Make a developer stop scrolling (a question, a mistake, or a surprising fact from the note).
  - Middle slides: one idea per slide, in a logical order. Use a tiny example where the note has one.
  - Last slide: a short recap plus a soft call to action (e.g. "Save this for your next RAG project").
- "caption": 2–4 short paragraphs that add context in first person and end with a question.
- "hashtags": 3 to 10 specific hashtags in the form #word (e.g. #aiengineering #llm #typescript). No generic ones like #love or #instagood.

Rules
- Slides must be readable on a phone: short, plain words, no code longer than one line.`,
} as const;
