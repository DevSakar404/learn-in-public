import ReactMarkdown, { type ExtraProps } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { DIAGRAMS } from "@/components/learn/lesson-diagrams";
import { cn } from "@/lib/utils";

/** A ```diagram block whose body is a known id (e.g. greet-node) renders that diagram; anything else stays code. */
function Pre({ node, ...props }: React.ComponentProps<"pre"> & ExtraProps) {
  const code = node?.children[0];
  if (code?.type === "element" && String(code.properties.className).includes("language-diagram")) {
    const text = code.children[0];
    const Diagram = text?.type === "text" ? DIAGRAMS[text.value.trim()] : undefined;
    if (Diagram) return <Diagram />;
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
