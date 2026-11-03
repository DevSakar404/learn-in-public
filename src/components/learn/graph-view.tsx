"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { prepareMermaid } from "@/domain/learn/graph-drawing";

/**
 * The graph LangGraph drew for this run, with the nodes that ran outlined.
 * Mermaid is loaded only when a run has a graph, so other pages never download it.
 */
export function GraphView({ mermaid, ran = [] }: { mermaid: string; ran?: string[] }) {
  const { resolvedTheme } = useTheme();
  // Mermaid uses the id in CSS selectors, so keep only characters CSS accepts.
  const id = `graph-${useId().replace(/[^\w-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const text = prepareMermaid(mermaid, ran);

  useEffect(() => {
    if (!resolvedTheme) return; // wait for the theme so the graph is drawn once
    let live = true;
    (async () => {
      try {
        const { default: m } = await import("mermaid");
        m.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
        });
        const drawn = await m.render(id, text);
        if (live) {
          setSvg(drawn.svg);
          setFailed(false);
        }
      } catch (error) {
        console.error("[graph-view] render failed", error);
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [id, text, resolvedTheme]);

  const path = ran.filter((node, i) => node !== ran[i - 1]).join(" → ");
  return (
    <figure className="rounded-xl border border-ember-line bg-card p-3">
      {failed ? (
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed">{mermaid}</pre>
      ) : svg ? (
        // Mermaid's own SVG, sanitised by securityLevel "strict"; the text comes from our server.
        <div
          className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p role="status" className="py-6 text-center text-sm text-muted-foreground">
          Drawing the graph…
        </p>
      )}
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        The graph, drawn by LangGraph. {path && <>Ran: {path}.</>}
      </figcaption>
    </figure>
  );
}
