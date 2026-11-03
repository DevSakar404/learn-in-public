import { describe, expect, it } from "vitest";
import { parseConcepts, splitPlayground } from "./lesson";

describe("splitPlayground", () => {
  it("returns the playground id and the body without the fence", () => {
    const md = "# Intro\n\nText.\n\n```playground\ngreet\n```\n\nMore.";
    expect(splitPlayground(md)).toEqual({
      body: "# Intro\n\nText.\n\n\n\nMore.",
      playground: "greet",
    });
  });

  it("leaves notes without a playground alone, including other code blocks", () => {
    const md = "```ts\nconst x = 1;\n```";
    expect(splitPlayground(md)).toEqual({ body: md, playground: null });
  });
});

describe("parseConcepts", () => {
  it("reads the header as labels and each later line as a concept", () => {
    const table = parseConcepts(
      "Concept | What it is | In the café\nNode | State in, state out | The counter\nbad line\nState | Data | The note\n",
    );
    expect(table).toEqual({
      labels: ["Concept", "What it is", "In the café"],
      rows: [
        { term: "Node", definition: "State in, state out", analogy: "The counter" },
        { term: "State", definition: "Data", analogy: "The note" },
      ],
    });
  });

  it("returns null without any concept rows", () => {
    expect(parseConcepts("Concept | What it is | In the café")).toBeNull();
    expect(parseConcepts("")).toBeNull();
  });
});
