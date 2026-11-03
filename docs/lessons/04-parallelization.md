<!--
Topic: LangChain
Title: LangChain 4: parallelization
Summary: Run LLM calls that don't need each other at the same time, then join the answers in code. The third of five common LLM workflows.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Parallelization** runs LLM calls at the same time when none of them needs another's answer. Then plain code joins the results.

## Think of three cooks and one tray

A table orders a starter, a main and a dessert. Three cooks make them at the same time, not one after another. The waiter waits for the last plate, then carries all three out on one tray.

The meal is ready as soon as the slowest dish is done, not after all three cooking times added up.

```concepts
Concept | What it is | In the kitchen
Independent calls | LLM calls that don't need each other's answers | Dishes that don't share a pan
Promise.all | Starts every call at once and waits for the last one | The waiter waiting for every plate
Join | Plain code that puts the answers together | Putting the plates on one tray
Sectioning | Different calls do different parts of the job | Starter, main and dessert by different cooks
Voting | The same call runs a few times and the answers are compared | Three cooks taste the soup and vote on the salt
```

## When to use it

There are two kinds:

- **Sectioning**: the job splits into separate parts. In the playground, one review gets three checks at once: sentiment, a summary and key points. Another common use: one call answers the user while a second checks the answer is safe.
- **Voting**: you ask the same thing a few times and compare. This helps when one answer isn't trustworthy enough on its own. For example, three reviewers check code for security problems, and one "yes" is enough to look closer.

Each focused call does its one job better than one call juggling everything.

**When not to:** if a step needs another step's answer, it can't run in parallel. That's a chain.

## Where people get stuck

- Parallel saves **time**, not money. Three calls still cost three calls.
- The **total time** is about the slowest call. If one call is much slower, the others wait for it.
- If any call fails, **Promise.all** fails. Decide whether the whole run should fail, or carry on with what you got.
- The **join** is usually plain code. You don't need another LLM call to glue strings together.

## Say it back

Try it in one sentence before you read mine:

> Parallelization starts independent LLM calls together, waits for the slowest, then joins their answers in plain code.

## What's next

In the playground, paste a product review and watch three boxes run side by side. Compare each box's time with the total. Next lesson: **orchestrator-workers**, where the model itself decides what runs in parallel.

```playground
parallel
```
