<!--
Topic: LangChain
Title: LangChain 6: evaluator-optimizer
Summary: One LLM call writes, another grades it and says what to fix, and they loop until it passes. The last of five common LLM workflows.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

In **evaluator-optimizer**, one LLM call writes an answer and another grades it. If the grade is a fail, the writer tries again with the feedback. They loop until it passes, or until you stop them.

## Think of the cook and the head chef tasting

The cook makes a sauce. The head chef tastes it: "Too salty, and it needs lemon." The cook makes it again with that in mind. The chef tastes again. When it's right, it goes out.

The kitchen also has a rule: after three tries, serve the best one you have. Dinner can't wait forever.

```concepts
Concept | What it is | In the kitchen
Optimizer | The LLM call that writes, then rewrites using the feedback | The cook making the sauce
Evaluator | An LLM call that grades the answer against clear rules and says what is wrong | The head chef tasting
Feedback | The evaluator's reason for a fail, sent to the next rewrite | "Too salty, needs lemon"
Loop | Write, grade, rewrite, again and again | Cook, taste, cook again
Round cap | The most rounds you allow before you stop | Serve after three tries
```

## When to use it

Two signs it fits:

- You have **clear rules** for good. For example: says what makes the product different, no clichés.
- A first try gets **better with feedback**. A person could say what is wrong, and the model can say it too.

Examples: a translation that needs care with tone, or a search that needs a few rounds to find everything.

**When not to:** if the rules are vague ("make it better"), the grader's feedback will be vague too, and the loop just burns calls.

## Where people get stuck

- Always add a **round cap**. A strict grader can say "fail" forever, and every round is two paid calls.
- The grader needs **rules**, not taste. "Says what makes it different, no clichés" gives useful feedback. "Is it good?" doesn't.
- Don't ask a model to **count**. It miscounts words and letters. Check lengths in plain code, like a gate.
- The grader's reply is **model output**. Ask for a fixed format, like "PASS" or "FAIL: reason", and check it in code.
- The writer only improves if you **send it the feedback** with its earlier try.

## Say it back

Try it in one sentence before you read mine:

> One call writes, another grades against clear rules and explains a fail, and the writer retries with that feedback until it passes or hits the round cap.

## What's next

In the playground, describe a product and watch the writer and grader go round. Open a round 2 writer box to see the feedback it was given.

That's all five workflows. In order of complexity:

1. **Chaining**: fixed steps in a row.
2. **Routing**: pick one path.
3. **Parallelization**: fixed steps side by side.
4. **Orchestrator-workers**: the model picks the steps.
5. **Evaluator-optimizer**: loop until it's good.

Start with the simplest one that does the job.

```playground
evaluate
```
