# F11: Learn LangChain, lesson 1 · post-MVP

**Goal:** teach LangChain/LangGraph in public, starting with one lesson: a single-node LLM call that greets the reader, with a live playground inside the post.

**Stories:** a reader opens the lesson post (topic "LangChain"), reads the code, types a name and runs the node. They see the greeting, the messages sent to the model, tokens and latency.

**Files by layer:** domain `learn/greeter.ts` · application `LearnService`, `rate-limiter.ts` · infra `ai/langchain-greeter.ts` (`greetNode`, `LangChainGreeter`) · app `actions/learn.ts` · app `blog/[slug]/playground/page.tsx` · components `learn/lesson-playground.tsx` (code + flow per lesson, CTA), `learn/greet-playground.tsx` (flow) · domain `note/lesson.ts` (`splitPlayground`) · content `docs/lessons/01-langchain-intro.md`

**Lessons 2–6: LLM workflows** (prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer; design: [spec](../superpowers/specs/2026-10-29-llm-workflows-design.md)). Playground ids `chain`, `route`, `parallel`, `orchestrate`, `evaluate`. Files: domain `learn/workflow.ts` · application `LearnService.runWorkflow` · infra `ai/langchain-workflows.ts` · app `actions/learn.ts` (`runWorkflow`) · components `learn/workflow-playground.tsx` (one flow view for all five, drawn from the run's steps; steps in one lane sit side by side), `learn/workflow-lessons.tsx` (code + walkthroughs) · content `docs/lessons/02-06`.

**Rules**

- The lesson is a normal note. A fenced block with language `playground` and body `greet` is replaced by a call to action at the end of the post. It opens `/blog/<slug>/playground`: the code on the left, the runnable flow (START → greetNode → END) on the right, stacked on phones. An unknown id leaves a normal post, and its playground URL is a 404.
- The lesson post explains the concept only (Feynman technique): one-line idea, an everyday analogy, where people get stuck, say it back. No code. `**bold**` marks the main keywords and gets a soft highlight on lesson posts. A ` ```diagram ` block with an id (`greet-node`) renders a diagram from `learn/lesson-diagrams.tsx`; an unknown id stays a code block. A ` ```concepts ` block (header line, then `term | definition | analogy` per line) renders concept cards: the definition on the left, the analogy on the right (`learn/concept-cards.tsx`, parsed by `parseConcepts`).
- The playground page holds the code, with plain comments on each step, and two folded walkthroughs: "Match it to the code" under the code, "Watch it run" under the flow.
- Model is fixed: OpenAI `gpt-4o-mini`, 80 max tokens (200 per call in the workflow lessons), 15s timeout per call, no retries. A workflow run makes 2–6 calls. Needs `OPENAI_API_KEY`; without it the playground says the demo isn't switched on.
- Public, so every run is rate limited: 5 per IP per minute (in memory, shared by all lessons) + a honeypot. Provider error text stays in the server log.
- Only `src/infrastructure/**` imports `@langchain/*` (ESLint).
- Look borrows bamboo harness's "Ember" tokens and Outfit font, scoped to the playground.

**Done when**

- [x] Schema, rate limiter, service (limit + honeypot) and greeter (reply, 429, missing key) are unit-tested.
- [x] The lesson is published under the "LangChain" topic and the playground returns a real greeting (checked locally).
- [x] Workflow service, all five workflows (gate stop, bad route, worker cap, round cap, unreadable grade) and errors are unit-tested.
- [x] All five workflow playgrounds return real runs (checked locally, 2026-10-29).
- [ ] Lessons 2–6 are published on the live site.
