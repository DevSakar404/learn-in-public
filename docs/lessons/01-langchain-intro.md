<!--
Source text for the first LangChain lesson. Publish it as a normal note:
  Topic: LangChain
  Title: LangChain 1: your first node
  Summary: One JS function, one prompt, one model call. The smallest LangChain pipeline there is.
Everything below the line is the note body. It explains the concept only, with the Feynman technique:
one plain idea, an analogy (a ```concepts block puts each definition next to its analogy, and a
```diagram block draws it: src/components/learn/),
where people get stuck, then say it back in one sentence. **Bold** marks the main keywords: on a
lesson post they get a soft highlight, so bold only those.
The `playground` block is pulled out of the text and replaced by a call to action at the end of the
post. It links to /blog/<slug>/playground: the commented code and the runnable flow, with the
"Match it to the code" and "Watch it run" walkthroughs (src/components/learn/lesson-playground.tsx).
-->

---

## The idea in one line

A **node** is a small function. You hand it a note with some facts on it, called the **state**. It does one job, then hands the note back with something new written on it.

That's the whole lesson. Everything else in LangChain and LangGraph is built from this one idea.

## Think of a café counter

You walk up and say your name. The person at the counter takes a greeting card that already says "Welcome, \_\_\_\_!" and writes your name in the blank. They pass the card to the chef. The chef reads it and writes a friendly reply. The card comes back to you.

Each piece of the café has a real name in LangChain:

```concepts
Concept | What it is | In the café
State | The data that goes into a node and comes back out, with something added | The note with your name on it
Prompt template | A list of messages with blanks like `{name}`, filled in at run time | The greeting card with a blank
Chat model | The LLM (large language model) that reads the messages and writes a reply | The chef
Chain | Joins the template to the model with `pipe`, so the filled-in messages go straight to it | Passing the card to the chef
Node | One function: state in, one job done, new state out | The whole counter
```

Put together, it looks like this:

```diagram
greet-node
```

## Where people get stuck

- The model only sees the **messages**. It can't see your code, your app or your earlier runs. If it isn't in the messages, the model doesn't know it.
- It has no **memory**. Run it twice and it greets you fresh each time. Memory is something you add later, by sending old messages again.
- You pay per **token**. Tokens are small pieces of words, roughly 4 letters each. A short prompt and a cap on reply length keep each run very cheap.
- The words change. The same name can get a different greeting each run, because the model picks its words with a bit of **randomness**.

## Say it back

The last step of the Feynman technique is to explain it yourself, in plain words. Try it in one sentence before you read mine:

> A node takes the state, fills a prompt template with it, asks the model, and returns the state with the model's answer added.

If you can say that without looking, you've got this lesson.

## What's next

Right now `greetNode` is a function on its own. In the next lessons, you join calls like it into **workflows**: in a row, side by side, or in a loop. The flow in the playground is already the smallest one: start, one node, end.

```playground
greet
```
