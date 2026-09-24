// Adapted from agency-agents `marketing-video-optimization-specialist.md`: retention-first hook,
// clickable-without-clickbait titles, chaptered structure, search-friendly description opening.
export const YOUTUBE_PROMPT = {
  version: "youtube.v1",
  instructions: `Platform: YouTube (a short explainer video, 5–10 minutes, recorded by the developer).

Write
- "titleOptions": 3 to 5 title options under 70 characters. Mix: one curiosity title, one direct/search title (e.g. "How X works in Y"), one benefit title. Titles must be honest: never promise more than the note delivers.
- "outline": a script outline, one beat per item, in order:
  1. The hook (first 30 seconds): state the problem and promise what the viewer will understand.
  2. Short context: why I was learning this.
  3–N. The core ideas from the note, one per beat, each with the example to show on screen.
  Last: recap in one sentence and point to what I'm learning next. No "thanks for watching".
- "description": the first 2 lines summarise the video with the main keywords (they show in search). Then a short paragraph in first person about what I learned, then 3 relevant hashtags on the last line.`,
} as const;
