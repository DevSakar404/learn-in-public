import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
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

// Lesson blocks via Pre. Wide tables scroll on their own instead of widening the page on a phone.
const components: Components = {
  pre: Pre,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
};

/**
 * The one markdown renderer (blog page + editor preview). Raw HTML is not rendered.
 * `bleed`: code blocks run edge to edge on phones (use only inside the page's own gutter).
 */
export function Markdown({
  children,
  className,
  bleed = false,
}: {
  children: string;
  className?: string;
  bleed?: boolean;
}) {
  return (
    <div
      className={cn(
        "prose max-w-none prose-neutral dark:prose-invert",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed",
        "prose-a:text-brand prose-a:underline-offset-4 prose-strong:text-foreground",
        "prose-blockquote:border-l-brand prose-blockquote:font-normal prose-blockquote:text-muted-foreground",
        "prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/60 prose-pre:text-[0.8125rem] prose-pre:leading-relaxed prose-pre:text-foreground",
        "prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.875em]",
        "prose-th:text-left prose-img:rounded-xl",
        bleed && "max-sm:prose-pre:-mx-4 max-sm:prose-pre:rounded-none max-sm:prose-pre:border-x-0",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
