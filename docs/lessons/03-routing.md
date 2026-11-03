<!--
Topic: LangChain
Title: LangChain 3: routing
Summary: One small LLM call sorts the input, then a specialist prompt handles it. The second of five common LLM workflows.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Routing** sorts the input first, then sends it to the handler built for that kind of input.

The first call doesn't answer the question. It only picks a **label**. Your code reads the label and picks the next step.

## Think of the host at the café door

You walk in. The host asks one quick question and sends you on: the bar for a coffee, the dining room for a meal, the counter for takeaway. Each place has staff trained for that job.

The host doesn't make your coffee. They just make sure the right person does.

```concepts
Concept | What it is | In the café
Classifier | A first LLM call that reads the input and replies with one label | The host's quick question
Label | One word from a fixed list, like billing, technical or general | "Bar", "dining room" or "takeaway"
Router | Plain code that checks the label and picks the handler | The host pointing you to the right door
Handler | A prompt written for one kind of input only | The staff who are trained for that area
```

## When to use it

- Inputs fall into **clear groups** that are better handled apart.
  For example, billing questions, tech problems and everything else.
- One prompt that tries to cover every group gets long, and gets worse at each one.
- The classifier can sort them **reliably**. If people would argue about the label, the model will too.

Routing can also save money: send easy questions to a small, cheap model and hard ones to a bigger model.

**When not to:** if every input gets the same kind of answer, one good prompt is simpler.

## Where people get stuck

- Models don't always reply with one clean word. They write "Billing." or "I think technical". The **router** must clean the label and check it is on the list.
- Plan for a label that isn't on the list. Fail clearly, or send it to a safe **default** route.
- Keep the classifier's job tiny. Ask for one word, not an answer.
- Each **handler** is a normal prompt. Routing just means picking which one to use.

## Say it back

Try it in one sentence before you read mine:

> Routing uses one small LLM call to label the input, then plain code sends it to the prompt written for that label.

## What's next

In the playground, ask a shop's support desk something: about a charge, a bug, or anything else. Watch which handler gets it. Next lesson: **parallelization**, where several calls run at the same time.

```playground
route
```
