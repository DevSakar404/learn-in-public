import ReactMarkdown, { type ExtraProps } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { GreetPlayground } from "@/components/learn/greet-playground";
import { cn } from "@/lib/utils";

/** Lesson playgrounds, placed in a post with a fenced block: ```playground\ngreet\n``` */
const PLAYGROUNDS: Record<string, () => React.JSX.Element> = { greet: GreetPlayground };

function Pre({ node, ...props }: React.ComponentProps<"pre"> & ExtraProps) {
  const code = node?.children[0];
  if (
    code?.type === "element" &&
    String(code.properties.className).includes("language-playground")
  ) {
    const text = code.children[0];
    const Playground = text?.type === "text" ? PLAYGROUNDS[text.value.trim()] : undefined;
    if (Playground) return <Playground />;
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
