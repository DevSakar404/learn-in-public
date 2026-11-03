<!--
Topic: LangChain
Title: LangChain 5: orchestrator-workers
Summary: One LLM call plans the subtasks, worker calls do them, a last call combines the results. The fourth of five common LLM workflows.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

In **orchestrator-workers**, one LLM call plans the work, other calls do each piece, and a last call puts the results together.

The big change from the last lesson: your code doesn't know the pieces in advance. **The model decides them.**

## Think of the head chef and a catering order

A catering order arrives: "a birthday lunch for 20, one guest is vegan". There is no fixed recipe for that. The head chef reads it and decides the dishes. They hand one dish to each cook. When the dishes are ready, the head chef plates everything into one meal.

A different order gets different dishes, and maybe a different number of cooks.

```concepts
Concept | What it is | In the kitchen
Orchestrator | An LLM call that breaks the goal into subtasks | The head chef planning the menu
Subtask | One piece of the work, written by the orchestrator | One dish on the menu
Worker | An LLM call that does one subtask and nothing else | A cook making one dish
Synthesizer | A last LLM call that combines the workers' results | The head chef plating the full meal
```

## When to use it

- The job is complex, and **you can't predict the subtasks**. They depend on the input.
- Examples: a coding tool that must change an unknown number of files, or research that must look in several places, depending on the question.

It looks like parallelization. The difference is who decides the pieces. In parallelization, you write them in code. Here, the model writes them for each input.

**When not to:** if the subtasks are the same every time, write them yourself. That's parallelization, and it's cheaper and easier to test.

## Where people get stuck

- The orchestrator's plan is **model output**. Ask for a strict format, like one subtask per line, and check it before you use it.
- **Cap the workers**. The model might plan ten subtasks, and each worker is a paid call. The playground stops at 3.
- Each **worker** sees only what you send it. Send the overall goal too, or it does its piece without knowing what for.
- The **synthesizer** is a real LLM call, not a string join. It has to turn separate answers into one.

## Say it back

Try it in one sentence before you read mine:

> An orchestrator call writes the subtasks, worker calls do them side by side, and a synthesizer call turns their results into one answer.

## What's next

In the playground, give it a goal and watch it plan the subtasks. Then try a different goal: the workers change. Next lesson: **evaluator-optimizer**, where one call grades another and sends it back to try again.

```playground
orchestrate
```
