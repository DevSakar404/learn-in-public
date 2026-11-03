# LLM workflows: five lessons, five playgrounds

**Goal:** teach the five common LLM workflows as LangChain lessons 2–6. Each lesson is one post with its own runnable playground.

**Source:** Anthropic, "Building effective agents" (December 2024), which names and defines these five workflows. The posts follow its definitions and its advice on when each pattern fits.

## Decisions

- **Five posts, one playground each.** This fits the existing rule (one ` ```playground ` block per note → `/blog/<slug>/playground`). No route or parser change, and "next in topic" chains the posts.
- **Plain LangChain, no LangGraph.** `ChatOpenAI` + `ChatPromptTemplate`, joined with `async`/`await` and `Promise.all`, so readers see the patterns are just code. No new dependency.
- **No new post diagrams.** The playground flow already draws each workflow's shape.
- **No streaming.** A run returns when it ends. The flow shows a stopwatch while it runs, the same way lesson 1 does.

## Lessons

All five use topic "LangChain", follow the F11 lesson style (idea in one line, analogy, `concepts` cards, where people get stuck, say it back, no code) and include "when not to use it".

| File                                      | Title                             | Playground id | Input              | Steps                                                                                    | Calls   |
| ----------------------------------------- | --------------------------------- | ------------- | ------------------ | ---------------------------------------------------------------------------------------- | ------- |
| `docs/lessons/02-prompt-chaining.md`      | LangChain 2: prompt chaining      | `chain`       | a topic            | outline (3 bullets) → gate in code (exactly 3 bullets, else stop) → tweet from outline   | 2       |
| `docs/lessons/03-routing.md`              | LangChain 3: routing              | `route`       | a support question | classify into `billing` / `technical` / `general` (Zod) → that route's specialist prompt | 2       |
| `docs/lessons/04-parallelization.md`      | LangChain 4: parallelization      | `parallel`    | a product review   | sentiment, one-line summary, key points, at once (`Promise.all`) → joined in code        | 3       |
| `docs/lessons/05-orchestrator-workers.md` | LangChain 5: orchestrator-workers | `orchestrate` | a goal             | planner returns 2–3 subtasks (Zod) → one worker each, in parallel → synthesizer          | up to 5 |
| `docs/lessons/06-evaluator-optimizer.md`  | LangChain 6: evaluator-optimizer  | `evaluate`    | a product idea     | write a tagline → grade `{ pass, feedback }` (Zod) → rewrite with feedback, max 3 rounds | up to 6 |

Input: 1–200 characters, trimmed. Same honeypot field as lesson 1.

## Code

| Layer          | File                                           | What                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| domain         | `src/domain/learn/workflow.ts`                 | `WorkflowId`, `WORKFLOW_IDS`, `WorkflowStep { lane, label, messages, output, usage, latencyMs }`, `WorkflowRun { steps, output, model, usage, latencyMs }`, `IWorkflowRunner.run(id, input)` → `Result<WorkflowRun, GenerationError>` |
| application    | `src/application/learn-service.ts`             | `workflowSchema` (id, input, website) and `LearnService.runWorkflow(clientKey, input)`: the same limiter and honeypot as `greet`                                                                                                      |
| infrastructure | `src/infrastructure/ai/langchain-workflows.ts` | The five workflows as exported async functions taking a model, plus `LangChainWorkflows implements IWorkflowRunner` (lazy model, missing key, error mapping as in `LangChainGreeter`)                                                 |
| composition    | `src/lib/container.ts`                         | Pass `new LangChainWorkflows(OPENAI_API_KEY)` into `LearnService`                                                                                                                                                                     |
| app            | `src/app/actions/learn.ts`                     | `runWorkflow`: Zod-parse → IP → `learn().runWorkflow` → return                                                                                                                                                                        |
| components     | `src/components/learn/workflow-playground.tsx` | `WorkflowPlayground({ id })`: one input, run button, flow drawn from `steps` grouped by `lane` (steps in one lane sit side by side), each step folds open to show messages, output, tokens, time                                      |
| components     | `src/components/learn/workflow-lessons.tsx`    | Teaching code, "Match it to the code" and "Watch it run" for each of the five; spread into `LESSONS` in `lesson-playground.tsx`                                                                                                       |

Model: `gpt-4o-mini`, `maxTokens` 200 per call, 15 s timeout per call, no retries. A run fails as a whole on the first failed call. Steps run before the failure are not shown.

## Errors

- Missing `OPENAI_API_KEY` → "This demo isn't switched on yet."
- Classifier, planner or grader output fails Zod → `invalid_output`, "The model gave an answer we couldn't read. Try again."
- Prompt-chaining gate fails → **not** an error. The run ends at the gate and the flow shows it stopped there, which is the point of a gate.
- Evaluator hits 3 rounds without a pass → not an error. The run returns the last tagline and says it stopped at the cap.
- Provider errors map as in `LangChainGreeter`: the detail goes to the server log, not the page.

## Change after the first real runs

The grader no longer checks length: `gpt-4o-mini` miscounted words and failed 9- and 11-word taglines as "12 or more". It now judges only "says what makes the product different, no cliches". The writer is still asked for under 12 words, and lesson 6 says to check lengths in code.

## Tests

- `learn-service.test.ts`: `runWorkflow` honours the limit and the honeypot.
- `langchain-workflows.test.ts` with a fake chat model: each workflow's step order and lanes, gate stop, unknown route label → `invalid_output`, planner capped at 3 subtasks, evaluator stops on pass and at 3 rounds, missing key.

## Cost

A run makes 2–6 `gpt-4o-mini` calls, about 3× what lesson 1 uses. The existing limit (5 runs per IP per minute, in memory) still applies.

## Done when

- [x] `pnpm lint && pnpm typecheck && pnpm test` pass.
- [x] Each of the five playgrounds runs locally and shows its steps.
- [x] Five lesson files exist and follow `docs/add-blog.md`.
- [x] F11 notes the five new playgrounds.
