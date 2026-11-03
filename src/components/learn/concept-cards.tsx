import type { ConceptTable } from "@/domain/note/lesson";

/** `code` spans inside a cell; everything else is plain text. */
function Inline({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="font-mono text-[0.85em] text-ember-text">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/** One card per concept: the real definition on the left, the everyday analogy on the right. */
export function ConceptCards({ table }: { table: ConceptTable }) {
  const [, , analogyLabel] = table.labels;
  return (
    <ul className="not-prose my-8 space-y-3">
      {table.rows.map((row) => (
        <li
          key={row.term}
          className="grid overflow-hidden rounded-xl border border-ember-line sm:grid-cols-[3fr_2fr]"
        >
          <div className="bg-card p-4">
            <p className="font-semibold text-ember-text">
              <Inline text={row.term} />
            </p>
            <p className="mt-1 text-sm">
              <Inline text={row.definition} />
            </p>
          </div>
          <div className="border-t border-ember-line bg-ember-surface p-4 sm:border-t-0 sm:border-l">
            <p className="text-xs text-muted-foreground">{analogyLabel}</p>
            <p className="mt-1 text-sm">
              <Inline text={row.analogy} />
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
