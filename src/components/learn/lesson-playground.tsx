import Link from "next/link";
import { GreetPlayground } from "@/components/learn/greet-playground";
import { Markdown } from "@/components/markdown";

// Teaching copy of greetNode (src/infrastructure/ai/langchain-greeter.ts runs the real one).
const GREET_CODE = `import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

// The model: OpenAI's gpt-4o-mini. It reads OPENAI_API_KEY from the env.
// maxTokens caps how long the reply can be, which also caps the cost.
const model = new ChatOpenAI({ model: "gpt-4o-mini", maxTokens: 80 });

// The prompt template: the messages we send, with blanks to fill in.
// "system" = instructions for the model. "human" = what the user says.
// {name} is a blank. It is filled in when the node runs.
const greetPrompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a friendly tutor. Greet the reader by name, briefly."],
  ["human", "Hi, my name is {name}."],
]);

// The node: state in, one LLM call, new state out.
export async function greetNode(state: { name: string }) {
  // pipe() joins the two: the filled-in messages go straight to the model.
  const chain = greetPrompt.pipe(model);

  // invoke() fills {name}, sends the messages and waits for the reply.
  const reply = await chain.invoke({ name: state.name });

  // reply is an AIMessage. Keep the old state and add the reply's text.
  return { ...state, greeting: reply.text };
}`;

const C = ({ children }: { children: React.ReactNode }) => (
  <code className="font-mono text-[0.85em] text-ember-text">{children}</code>
);

const GREET_MATCH = (
  <>
    <p>Read the code on the left from top to bottom:</p>
    <ol>
      <li>
        <C>new ChatOpenAI(...)</C> hires the chef: OpenAI&apos;s <C>gpt-4o-mini</C> model.{" "}
        <C>maxTokens: 80</C> tells it to keep the reply short.
      </li>
      <li>
        <C>ChatPromptTemplate.fromMessages(...)</C> prints the card. The <strong>system</strong>{" "}
        message is the chef&apos;s instructions. The <strong>human</strong> message is what you say,
        with <C>{"{name}"}</C> left blank.
      </li>
      <li>
        <C>greetNode</C> is the counter. It joins card and chef with <C>pipe</C>, fills in your name
        with <C>invoke</C>, and returns the state with a new <C>greeting</C> on it.
      </li>
    </ol>
  </>
);

const GREET_RUN = (
  <>
    <p>
      Type your name in the flow above and press <strong>Run node</strong>. This is what happens, in
      order:
    </p>
    <ol>
      <li>
        Your name becomes the starting state: <C>{'{ name: "..." }'}</C>.
      </li>
      <li>The template fills in the blank and makes two messages.</li>
      <li>Those two messages travel to OpenAI over the internet.</li>
      <li>
        The model writes a reply. LangChain wraps it in an <C>AIMessage</C>.
      </li>
      <li>
        The node copies the reply&apos;s text into <C>greeting</C> and returns the new state.
      </li>
    </ol>
    <p>
      After a run, open <strong>Sent to the model</strong> to see step 3 for real: the exact two
      messages, and how many tokens went in and out.
    </p>
  </>
);

interface Lesson {
  file: string;
  code: string;
  Flow: () => React.JSX.Element;
  /** Walkthroughs, folded away until a reader wants them. */
  match: React.ReactNode;
  run: React.ReactNode;
}

/** Lessons by playground id: the code the lesson teaches and the live flow that runs it. */
const LESSONS: Record<string, Lesson> = {
  greet: {
    file: "greet-node.ts",
    code: GREET_CODE,
    Flow: GreetPlayground,
    match: GREET_MATCH,
    run: GREET_RUN,
  },
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
        See the code with notes, then run the node with your name and watch each step.
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

/** A walkthrough folded under a one-line title. Native <details>: keyboard and screen-reader ready. */
function Explainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-2xl border border-ember-line bg-card">
      <summary className="cursor-pointer rounded-2xl px-5 py-3.5 font-display text-lg font-semibold marker:text-ember-text focus-visible:outline-2 focus-visible:outline-ember">
        {title}
      </summary>
      <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5">
        {children}
      </div>
    </details>
  );
}

/** The playground page body: the code on the left, the runnable flow on the right. */
export function LessonPlayground({ id }: { id: string }) {
  const lesson = LESSONS[id];
  if (!lesson) return null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <figure className="overflow-hidden rounded-2xl border border-ember-line bg-card">
          <figcaption className="border-b border-ember-line px-4 py-2.5 font-mono text-xs text-muted-foreground">
            {lesson.file}
          </figcaption>
          <Markdown className="prose-sm prose-pre:m-0 prose-pre:rounded-none prose-pre:bg-transparent prose-pre:text-[0.8rem]">
            {"```ts\n" + lesson.code + "\n```"}
          </Markdown>
        </figure>
        <Explainer title="Match it to the code">{lesson.match}</Explainer>
      </div>
      <div className="space-y-4">
        <lesson.Flow />
        <Explainer title="Watch it run">{lesson.run}</Explainer>
      </div>
    </div>
  );
}
