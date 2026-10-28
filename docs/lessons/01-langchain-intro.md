<!--
Source text for the first LangChain lesson. Publish it as a normal note:
  Topic: LangChain
  Title: LangChain 1: your first node
  Summary: One JS function, one prompt, one model call. The smallest LangChain pipeline there is.
Everything below the line is the note body. Written with the Feynman technique: one plain idea, an
analogy, match it to the code, find where people get stuck, then say it back in one sentence.
The `playground` block is pulled out of the text and replaced by a call to action at the end of the
post. It links to /blog/<slug>/playground: the code on the left, the runnable flow on the right
(src/components/learn/lesson-playground.tsx).
-->

---

## The idea in one line

A **node** is a small function. You hand it a note with some facts on it, called the **state**. It does one job, then hands the note back with something new written on it.

That's the whole lesson. Everything else in LangChain and LangGraph is built from this one idea.

## Think of a café counter

You walk up and say your name. The person at the counter takes a greeting card that already says "Welcome, \_\_\_\_!" and writes your name in the blank. They pass the card to the chef. The chef reads it and writes a friendly reply. The card comes back to you.

- The **card with a blank** is the _prompt template_. The blank is `{name}`.
- The **chef** is the _chat model_, the LLM (large language model). It reads the card and writes a reply.
- **Passing the card** from counter to chef is the _chain_. In code it's one word: `pipe`.
- The **whole counter**, from your name going in to the reply coming out, is the _node_.

## Match it to the code

Here is all of it:

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

// The chef: an OpenAI chat model. Reads OPENAI_API_KEY from the environment.
const model = new ChatOpenAI({ model: "gpt-4o-mini", maxTokens: 80 });

// The card template: instructions + what you say, with a {name} blank.
const greetPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a friendly tutor. Greet the reader by name, briefly."],
  ["human", "Hi, my name is {name}."],
]);

// The node: state in, one LLM call, state out.
export async function greetNode(state: { name: string }) {
  const chain = greetPrompt.pipe(model);
  const reply = await chain.invoke({ name: state.name });
  return { ...state, greeting: reply.text };
}
```

Read it from top to bottom:

1. `new ChatOpenAI(...)` hires the chef: OpenAI's `gpt-4o-mini` model. `maxTokens: 80` tells it to keep the reply short.
2. `ChatPromptTemplate.fromMessages(...)` prints the card. The **system** message is the chef's instructions. The **human** message is what you say, with `{name}` left blank.
3. `greetNode` is the counter. It joins card and chef with `pipe`, fills in your name with `invoke`, and returns the state with a new `greeting` on it.

## Watch it run

Open the playground at the end of this post, type your name and press **Run node**. This is what happens, in order:

1. Your name becomes the starting state: `{ name: "..." }`.
2. The template fills in the blank and makes two messages.
3. Those two messages travel to OpenAI over the internet.
4. The model writes a reply. LangChain wraps it in an `AIMessage`.
5. The node copies the reply's text into `greeting` and returns the new state.

After a run, open **Sent to the model** to see step 3 for real: the exact two messages, and how many tokens went in and out.

## Where people get stuck

- **The model only sees the messages.** It can't see your code, your app or your earlier runs. If it isn't in the messages, the model doesn't know it.
- **It doesn't remember you.** Run it twice and it greets you fresh each time. Memory is something _you_ add later, by sending old messages again.
- **You pay per token.** Tokens are small pieces of words, roughly 4 letters each. A short prompt and a `maxTokens` limit keep each run very cheap.
- **The words change.** The same name can get a different greeting each run. That's normal for an LLM.

## Say it back

The last step of the Feynman technique is to explain it yourself, in plain words. Try it in one sentence before you read mine:

> A node takes the state, fills a prompt template with it, asks the model, and returns the state with the model's answer added.

If you can say that without looking, you've got this lesson.

## What's next

Right now `greetNode` is a function on its own. In the next lesson, LangGraph puts it inside a **graph**: a map of nodes and arrows that passes the state from one node to the next. The flow in the playground is already a tiny graph: start, one node, end.

```playground
greet
```
