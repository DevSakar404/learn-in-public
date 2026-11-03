/**
 * Gets LangGraph's Mermaid text (drawMermaid) ready for the page: START/END labels, no fixed
 * colours (the site's Mermaid theme picks them, so it reads in light and dark), and the nodes
 * that ran marked so the reader sees the path the run took.
 */
export function prepareMermaid(mermaid: string, ran: readonly string[] = []): string {
  const lines = mermaid
    .replace("<p>__start__</p>", "START")
    .replace("<p>__end__</p>", "END")
    .replaceAll(":::first", "")
    .replaceAll(":::last", "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("classDef"));
  const nodes = [...new Set(ran)].filter((node) => /^\w+$/.test(node));
  if (nodes.length > 0) {
    lines.push("\tclassDef ran stroke:#f97316,stroke-width:3px;");
    lines.push(`\tclass ${nodes.join(",")} ran;`);
  }
  return lines.join("\n");
}
