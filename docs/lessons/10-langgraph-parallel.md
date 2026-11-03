<!--
Topic: LangGraph
Title: LangGraph 4: parallel nodes
Summary: Three edges out of START run three nodes at once; an edge from a list waits for all of them. Plus the one rule that trips everyone up.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

Add several edges out of one node and the targets run **at the same time**. An edge **from a list** of nodes waits for all of them before the next node runs.

LangGraph runs in **steps**. In each step, every node that's ready runs together, then their updates are merged into the state.

## Think of three platforms

At the hub, three trains leave at once on three platforms. They all come back to one junction, and the train out of the junction waits until all three have arrived.

```concepts
Concept | What it is | At the hub
Fan out | Several edges from one node, so the targets run in the same step | Three trains leaving at once
Fan in | An edge from a list of nodes into one node, which waits for all of them | The junction train waiting for every arrival
Step | One round where every ready node runs, then updates are merged | One departure time
Own field | Each parallel node writes a field no other node writes in that step | Each train has its own luggage rack
Reducer | A rule for merging updates to the same field, like adding to a list | A shared bin everyone drops luggage into
```

## Warm-up: a cricket scorecard

The tutorials do this with a batsman's numbers first. Strike rate, balls per boundary and boundary percentage each come from the same runs and balls, so three nodes work them out at once and a summary node joins them. No model needed. Then they do it again with three LLM judges marking an essay.

## Where people get stuck

- Two nodes writing the **same field in the same step** is an error, unless that field has a **reducer**. Give each node its own field, or add a reducer (next lesson).
- The total time is about the **slowest** node, not the sum.
- Only fan out work that's really **independent**. If one node needs another's answer, it's a chain.

## Say it back

Try it in one sentence before you read mine:

> Edges out of one node run the targets together in one step, an edge from a list waits for all of them, and each parallel node writes its own field unless a reducer merges them.

## What's next

In the playground, a review goes to three nodes at once and a plain-code join builds the report. The drawing shows the fan out and the fan in. Next lesson: the model decides how many workers to start.

```playground
lg-parallel
```
