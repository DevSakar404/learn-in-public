import type { Platform, PlatformContent } from "@/domain/post/post";

export const sampleContent: PlatformContent = {
  x: {
    post: "Tokens are not words. Today I learned they are ~4 characters of English.",
    thread: [],
  },
  linkedin: {
    hook: "I assumed 1 token = 1 word. I was off by 25%.",
    body: "Today I measured it.\n\nTokens are chunks of ~4 characters.",
    question: "How do you estimate token cost?",
  },
  instagram: {
    slides: Array.from({ length: 6 }, (_, i) => ({ title: `Slide ${i + 1}`, body: "One idea." })),
    caption: "What I learned about tokens today.",
    hashtags: ["#aiengineering", "#llm", "#typescript"],
  },
  youtube: {
    titleOptions: ["What a token really is", "How tokenizers work", "Stop guessing token costs"],
    outline: ["Hook", "Context", "Core idea"],
    description: "Tokens explained.\nWhat I learned today.\n#ai #llm #dev",
  },
};

/** Picks the sample matching the platform named in the prompt's system text. */
export function sampleFor(system: string): PlatformContent[Platform] {
  if (system.includes("Platform: X")) return sampleContent.x;
  if (system.includes("Platform: LinkedIn")) return sampleContent.linkedin;
  if (system.includes("Platform: Instagram")) return sampleContent.instagram;
  return sampleContent.youtube;
}
