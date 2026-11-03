<!--
Topic: LangGraph
Title: LangGraph 6: evaluator-optimizer, a loop with a cap
Summary: A writer node, a grader node, and a conditional edge that loops back on a FAIL. The round counter in the state is what stops it.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

A conditional edge can point **back** to an earlier node. That's a **loop**: write, grade, and on a FAIL write again with the feedback. A **round counter** in the state stops it.

## Think of a circle line with an inspector

The train goes round a circle line. At one station an inspector checks the carriage. Pass, and the train leaves the circle. Fail, and it goes round again with a note on what to fix. After three laps it leaves anyway, so it can't go round forever.

```concepts
Concept | What it is | On the circle line
Optimizer | The node that writes, or rewrites using the feedback | The crew fixing the carriage
Evaluator | The node that grades and writes pass or fail plus feedback into the state | The inspector
Loop | A conditional edge that can return an earlier node's name | The track back round the circle
Cap | A counter in the state the edge checks, so the loop must end | The three-lap limit
```

## Where people get stuck

- **Always cap the loop.** LangGraph has a safety limit on steps, but your own counter should stop it first, with a clear answer.
- Keep the counter **in the state**. A node increments it, the edge reads it.
- The grader needs **clear rules** and must say **why** it failed, or the rewrite has nothing to work with.
- Models miscount words. Check **lengths in code**, not in the grader.
- The tutorials keep a history of every draft with a reducer that adds to a list. Try it: without the reducer, only the last draft survives.

## Say it back

Try it in one sentence before you read mine:

> An evaluator-optimizer graph loops through a conditional edge back to the writer until the grader passes it or the round counter in the state hits the cap.

## What's next

In the playground, describe a product and watch rounds stack up until a PASS. The drawing shows the line from grade back to write. That's the five workflows done as graphs. Next: tools and agents, where the model chooses the steps.

```playground
lg-evaluate
```
