/** Points right on wide screens, down when the diagram stacks on phones. */
function Arrow({ label }: { label?: string }) {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center justify-center gap-0.5 text-ember-text sm:flex-row"
    >
      {label && <span className="font-mono text-[0.7rem]">{label}</span>}
      <span className="rotate-90 text-lg leading-none sm:rotate-0">→</span>
    </div>
  );
}

function State({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ember-line bg-card px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 font-mono text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function Part({ name, analogy }: { name: string; analogy: string }) {
  return (
    <div className="rounded-lg bg-card px-3 py-2 text-center">
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{analogy}</p>
    </div>
  );
}

/** Lesson 1: state in → greetNode (prompt template | chat model) → state out. */
function GreetNodeDiagram() {
  return (
    <figure className="not-prose my-8">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1.8fr_auto_1.2fr]">
        <State title="state in">{'{ name: "Sam" }'}</State>
        <Arrow />
        <div className="rounded-2xl border border-ember bg-ember-surface p-3">
          <p className="text-center font-mono text-xs font-semibold text-ember-text">
            node: greetNode
          </p>
          <div className="mt-2 grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr]">
            <Part name="Prompt template" analogy="the card with a blank" />
            <Arrow label="pipe" />
            <Part name="Chat model" analogy="the chef" />
          </div>
        </div>
        <Arrow />
        <State title="state out">
          <span className="block whitespace-nowrap">{'{ name: "Sam",'}</span>
          <span className="block whitespace-nowrap">{'greeting: "Hi Sam!" }'}</span>
        </State>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted-foreground">
        State goes in, the node makes one LLM call, and the state comes out with a greeting added.
      </figcaption>
    </figure>
  );
}

/** Lesson diagrams by id, placed in a post with a ```diagram block whose body is the id. */
export const DIAGRAMS: Record<string, () => React.JSX.Element> = { "greet-node": GreetNodeDiagram };
