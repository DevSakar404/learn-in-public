# F11: Learn LangChain, lesson 1 · post-MVP

**Goal:** teach LangChain/LangGraph in public, starting with one lesson: a single-node LLM call that greets the reader, with a live playground inside the post.

**Stories:** a reader opens the lesson post (topic "LangChain"), reads the code, types a name and runs the node. They see the greeting, the messages sent to the model, tokens and latency.

**Files by layer:** domain `learn/greeter.ts` · application `LearnService`, `rate-limiter.ts` · infra `ai/langchain-greeter.ts` (`greetNode`, `LangChainGreeter`) · app `actions/learn.ts` · app `blog/[slug]/playground/page.tsx` · components `learn/lesson-playground.tsx` (code + flow per lesson, CTA), `learn/greet-playground.tsx` (flow) · domain `note/lesson.ts` (`splitPlayground`) · content `docs/lessons/01-langchain-intro.md`

**Rules**

- The lesson is a normal note. A fenced block with language `playground` and body `greet` is replaced by a call to action at the end of the post. It opens `/blog/<slug>/playground`: the code on the left, the runnable flow (START → greetNode → END) on the right, stacked on phones. An unknown id leaves a normal post, and its playground URL is a 404.
- Lesson text follows the Feynman technique: one-line idea, an everyday analogy, match it to the code, where people get stuck, say it back.
- Model is fixed: OpenAI `gpt-4o-mini`, 80 max tokens, 15s timeout, no retries. Needs `OPENAI_API_KEY`; without it the playground says the demo isn't switched on.
- Public, so every run is rate limited: 5 per IP per minute (in memory) + a honeypot. Provider error text stays in the server log.
- Only `src/infrastructure/**` imports `@langchain/*` (ESLint).
- Look borrows bamboo harness's "Ember" tokens and Outfit font, scoped to the playground.

**Done when**

- [x] Schema, rate limiter, service (limit + honeypot) and greeter (reply, 429, missing key) are unit-tested.
- [x] The lesson is published under the "LangChain" topic and the playground returns a real greeting (checked locally).
