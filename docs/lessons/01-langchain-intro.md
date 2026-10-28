<!--
Source text for the first LangChain lesson. Publish it as a normal note:
  Topic: LangChain
  Title: LangChain 1: your first node
  Summary: One JS function, one prompt, one model call. The smallest LangChain pipeline there is.
Everything below the line is the note body. The `playground` block renders the live demo (src/components/markdown.tsx).
-->

---

Before graphs, agents and tools, there is one idea worth getting right: a **node** is a plain function. It takes some state, does one job, and returns new state. In this lesson the job is a single call to an LLM (a large language model) that greets you by name.

## The three pieces

- **Prompt template**: a message with blanks in it. `{name}` is filled in at run time.
- **Chat model**: the LLM itself. Here it is OpenAI's `gpt-4o-mini` through `ChatOpenAI`.
- **Chain**: `prompt.pipe(model)` joins them. The template's output goes straight into the model.

## The code

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ model: "gpt-4o-mini", maxTokens: 80 });

const greetPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a friendly tutor. Greet the reader by name in one or two short sentences."],
  ["human", "Hi, my name is {name}."],
]);

// A node: state in, one LLM call, state out.
export async function greetNode(state: { name: string }) {
  const chain = greetPrompt.pipe(model);
  const reply = await chain.invoke({ name: state.name });
  return { ...state, greeting: reply.text };
}

await greetNode({ name: "Sam" });
// → { name: "Sam", greeting: "Hi Sam! Welcome to your first LangChain lesson..." }
```

`ChatOpenAI` reads `OPENAI_API_KEY` from the environment. `reply` is an `AIMessage`: besides `.text` it carries `usage_metadata`, the token counts you pay for.

## Try it

```playground
greet
```

Open **Sent to the model** after a run. Your name went into the `{name}` blank, and the system message went with it. That pair of messages is all the model ever sees.

## Why a function

The node does not know where its state came from or where it goes next. That is what makes it easy to test and easy to reuse. In LangGraph, the next topic, you register this same function as a node in a graph, and the graph passes state from one node to the next.
