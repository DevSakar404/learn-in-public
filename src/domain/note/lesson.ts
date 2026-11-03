/** A lesson post marks its playground with a fenced block: ```playground\n<id>\n```. */
const PLAYGROUND_FENCE = /^```playground[ \t]*\r?\n[ \t]*([\w-]+)[ \t]*\r?\n```[ \t]*$/m;

/** Pulls the playground id out of a note's markdown and returns the body without the fence. */
export function splitPlayground(contentMd: string): { body: string; playground: string | null } {
  const match = PLAYGROUND_FENCE.exec(contentMd);
  if (!match) return { body: contentMd, playground: null };
  return { body: contentMd.replace(match[0], "").trim(), playground: match[1] ?? null };
}

export interface ConceptTable {
  /** Column labels from the first line, e.g. ["Concept", "What it is", "In the café"]. */
  labels: [string, string, string];
  rows: { term: string; definition: string; analogy: string }[];
}

/**
 * Parses a ```concepts block: a header line, then one concept per line, cells split by "|":
 *   Concept | What it is | In the café
 *   Node | One function: state in, new state out | The whole counter
 * Lines without exactly three non-empty cells are skipped. Null when no rows are left.
 */
export function parseConcepts(text: string): ConceptTable | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .filter(
      (cells): cells is [string, string, string] => cells.length === 3 && cells.every(Boolean),
    );
  const [labels, ...rows] = lines;
  if (!labels || rows.length === 0) return null;
  return {
    labels,
    rows: rows.map(([term, definition, analogy]) => ({ term, definition, analogy })),
  };
}
