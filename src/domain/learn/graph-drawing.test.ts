import { describe, expect, it } from "vitest";
import { prepareMermaid } from "./graph-drawing";

// What drawMermaid() returns for START → plan -.-> worker → synthesize → END.
const DRAWN = `%%{init: {'flowchart': {'curve': 'linear'}}}%%
graph TD;
\t__start__([<p>__start__</p>]):::first
\tplan(plan)
\tworker(worker)
\tsynthesize(synthesize)
\t__end__([<p>__end__</p>]):::last
\t__start__ --> plan;
\tsynthesize --> __end__;
\tworker --> synthesize;
\tplan -.-> worker;
\tclassDef default fill:#f2f0ff,line-height:1.2
\tclassDef first fill-opacity:0
\tclassDef last fill:#bfb6fc
`;

describe("prepareMermaid", () => {
  it("labels START and END and drops LangGraph's fixed colours", () => {
    const out = prepareMermaid(DRAWN);
    expect(out).toContain("__start__([START])");
    expect(out).toContain("__end__([END])");
    expect(out).not.toContain("classDef default");
    expect(out).not.toContain(":::first");
    expect(out).not.toContain(":::last");
    expect(out).toContain("plan -.-> worker;");
  });

  it("marks each node that ran once", () => {
    const out = prepareMermaid(DRAWN, ["plan", "worker", "worker", "synthesize"]);
    expect(out).toContain("classDef ran ");
    expect(out.trimEnd().endsWith("class plan,worker,synthesize ran;")).toBe(true);
  });

  it("adds no class line when nothing ran, and ignores names that aren't plain words", () => {
    expect(prepareMermaid(DRAWN)).not.toContain("classDef ran");
    expect(prepareMermaid(DRAWN, ["plan; click plan"])).not.toContain("classDef ran");
  });
});
