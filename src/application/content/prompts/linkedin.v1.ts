// Adapted from agency-agents `marketing-linkedin-content-creator.md`: first-line hook, specificity over
// inspiration, a defensible take, one idea per paragraph, a question that invites replies.
export const LINKEDIN_PROMPT = {
  version: "linkedin.v1",
  instructions: `Platform: LinkedIn.

Write
- "hook": the first line, under 200 characters. It must earn the "see more" click without giving away the insight. Prefer a specific moment ("Yesterday I spent 2 hours debugging a prompt that was fine.") over a general claim.
- "body": a short story or insight from the note. Structure: the specific moment or problem → what I tried → what I learned → why it matters for other developers. One idea per paragraph, 1–3 lines each, blank lines between paragraphs. Have a clear point of view.
- "question": one closing question that invites developers to share their experience (e.g. "How do you handle X?"). Not "Agree?" and not "Like if…".

Rules
- Sounds like a developer talking to other developers, not a motivational poster.
- No links in the text. No more than 3 hashtags, placed at the end of the body, and only if they are specific.`,
} as const;
