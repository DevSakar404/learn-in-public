import ReactMarkdown, { type ExtraProps } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { ConceptCards } from "@/components/learn/concept-cards";
import { DIAGRAMS } from "@/components/learn/lesson-diagrams";
import { parseConcepts } from "@/domain/note/lesson";
import { cn } from "@/lib/utils";

type HastElement = NonNullable<ExtraProps["node"]>;

/** Text of a hast node, joined across child spans (a highlighter may split it). */
const textOf = (node: HastElement | HastElement["children"][number]): string =>
  node.type === "text" ? node.value : "children" in node ? node.children.map(textOf).join("") : "";

/**
 * Lesson blocks, everything else stays code:
 * ```diagram with a known id (e.g. greet-node) renders that diagram;
 * ```concepts with "term | definition | analogy" lines renders concept cards.
 */
function Pre({ node, ...props }: React.ComponentProps<"pre"> & ExtraProps) {
  const code = node?.children[0];
  if (code?.type === "element") {
    const lang = String(code.properties.className);
    if (lang.includes("language-diagram")) {
      const Diagram = DIAGRAMS[textOf(code).trim()];
      if (Diagram) return <Diagram />;
    }
    if (lang.includes("language-concepts")) {
      const table = parseConcepts(textOf(code));
      if (table) return <ConceptCards table={table} />;
    }
  }
  return <pre {...props} />;
}

/** The one markdown renderer (blog page + editor preview). Raw HTML is not rendered. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose max-w-none prose-neutral dark:prose-invert prose-pre:bg-muted prose-pre:text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={{ pre: Pre }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
