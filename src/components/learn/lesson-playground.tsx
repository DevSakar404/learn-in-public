import Link from "next/link";
import { GreetPlayground } from "@/components/learn/greet-playground";
import { Markdown } from "@/components/markdown";

// Teaching copy of greetNode (src/infrastructure/ai/langchain-greeter.ts runs the real one).
const GREET_CODE = `import { ChatPromptTemplate } from "@langchain/core/prompts";
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
}`;

/** Lessons by playground id: the code the lesson teaches and the live flow that runs it. */
const LESSONS: Record<string, { file: string; code: string; Flow: () => React.JSX.Element }> = {
  greet: { file: "greet-node.ts", code: GREET_CODE, Flow: GreetPlayground },
};

export const hasLesson = (id: string | null): id is string => id !== null && id in LESSONS;

/** End of a lesson post: points readers to the playground page. */
export function PlaygroundCta({ href }: { href: string }) {
  return (
    <section
      aria-labelledby="playground-cta"
      className="not-prose rounded-2xl border border-ember-line bg-ember-surface p-6"
    >
      <h2 id="playground-cta" className="font-display text-2xl font-semibold tracking-tight">
        Try it in the playground
      </h2>
      <p className="mt-2 text-muted-foreground">
        See the code next to the flow, type your name and run the node for real.
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-ember px-5 font-semibold text-ember-ink hover:bg-ember-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        Open the playground
      </Link>
    </section>
  );
}

/** The playground page body: the code on the left, the runnable flow on the right. */
export function LessonPlayground({ id }: { id: string }) {
  const lesson = LESSONS[id];
  if (!lesson) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <figure className="overflow-hidden rounded-2xl border border-ember-line bg-card lg:sticky lg:top-6">
        <figcaption className="border-b border-ember-line px-4 py-2.5 font-mono text-xs text-muted-foreground">
          {lesson.file}
        </figcaption>
        <Markdown className="prose-sm prose-pre:m-0 prose-pre:rounded-none prose-pre:bg-transparent prose-pre:text-[0.8rem]">
          {"```ts\n" + lesson.code + "\n```"}
        </Markdown>
      </figure>
      <lesson.Flow />
    </div>
  );
}
