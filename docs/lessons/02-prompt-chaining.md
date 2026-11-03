<!--
Topic: LangChain
Title: LangChain 2: prompt chaining
Summary: Split one big ask into small LLM calls in a row, with a check in between. The first of five common LLM workflows.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Prompt chaining** splits one big job into small steps. Each step is one LLM call, and each call works on the answer from the step before.

In lesson 1 you built one node: one call. Now you join a few of them in a row.

## Workflows first, agents later

This lesson starts a series on five common LLM **workflows**. Anthropic's guide "Building effective agents" describes them all.

- In a **workflow**, your code decides the steps. The model fills in each step.
- In an **agent**, the model decides the steps itself, as it goes.

Workflows are easier to test, cheaper and more predictable. The guide's advice is to start with the simplest thing that works, and only add steps when they clearly help.

## Think of a café kitchen line

A big order arrives. One cook doesn't do it all. The first cook preps the vegetables. Someone checks the prep: right cut, right amount? Only then does the next cook start cooking with it.

If the prep is wrong, the line stops there. Nobody wastes time cooking bad ingredients.

```concepts
Concept | What it is | In the kitchen
Step | One LLM call with one small job | One cook's station
Chain | Steps in a fixed order, each using the step before's output | Prep, then cook, then plate
Gate | A check in plain code between two steps. If it fails, the chain stops | Checking the prep before cooking
Hand-off | The output of one step becomes the input of the next | Passing the chopped vegetables down the line
```

## When to use it

- The job splits cleanly into **fixed** steps you know in advance.
  For example, write an outline, check it, then write the post from it.
- Each step is easier for the model than the whole job at once.
- You can live with a slower answer. More calls take more time, but each one is more likely to be right.

**When not to:** if one call already does the job well, stop there. Each extra step adds time, cost and one more thing that can break.

## Where people get stuck

- The **gate** is plain code, not another LLM call. Counting bullets or checking a word limit is free and never wrong.
- A gate only works if step 1 has a **strict format**, like "exactly 3 lines starting with -". Ask for a shape you can check.
- Step 2 only sees what you **hand it**. If it needs the user's original words too, you must pass them in yourself.
- A chain is only as strong as its weakest step. Test each step on its own.

## Say it back

Try it in one sentence before you read mine:

> Prompt chaining is a fixed row of small LLM calls, each fed by the one before, with plain-code checks in between that can stop the line early.

## What's next

In the playground, a topic goes through three steps: an outline, a gate, then a tweet. Try a topic and watch the gate pass. Next lesson: **routing**, where the first call decides which path the rest takes.

```playground
chain
```
