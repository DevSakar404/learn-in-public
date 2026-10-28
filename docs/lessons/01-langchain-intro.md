<!--
Source text for the first LangChain lesson. Publish it as a normal note:
  Topic: LangChain
  Title: LangChain 1: your first node
  Summary: One JS function, one prompt, one model call. The smallest LangChain pipeline there is.
Everything below the line is the note body. It explains the concept only, with the Feynman technique:
one plain idea, an analogy (with a ```diagram block, src/components/learn/lesson-diagrams.tsx),
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

- The card with a blank is the **prompt template**. The blank is `{name}`.
- The chef is the **chat model**, the LLM (large language model). It reads the card and writes a reply.
- Passing the card from counter to chef is the **chain**. In code it's one word: `pipe`.
- The whole counter, from your name going in to the reply coming out, is the **node**.

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

Right now `greetNode` is a function on its own. In the next lesson, LangGraph puts it inside a **graph**: a map of nodes and arrows that passes the state from one node to the next. The flow in the playground is already a tiny graph: start, one node, end.

```playground
greet
```
