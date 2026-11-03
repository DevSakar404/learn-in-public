<!--
Topic: LangGraph
Title: LangGraph 2: prompt chaining with a conditional edge
Summary: Two nodes in a row, and a gate that can end the run early. The gate is a conditional edge: plain code that picks the next node.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Prompt chaining** in a graph is nodes in a row, each reading what the last one wrote into the state. A **conditional edge** between them is the gate: plain code that picks the next node, or END.

It's the same workflow as LangChain lesson 2. The difference is where the decision lives: in an edge, where the graph can see it and draw it.

## Think of a signal on the line

The train leaves the first station. Before the next one, there's a signal. If the carriage is loaded right, the signal is green and the train goes on. If not, it's red and the train goes to the depot. Nobody at the next station wastes time on a bad load.

```concepts
Concept | What it is | On the train line
Hand-off | One node writes a field, the next node reads it from the state | Cargo loaded at one station, unloaded at the next
Conditional edge | A function that reads the state and returns the next node's name, or END | A signal that chooses the track
Path list | Every place a conditional edge can go, given when you add it | The tracks drawn on the map, even the ones not taken
Gate | A conditional edge that can stop the run early | A red signal that sends the train to the depot
```

## Warm-up: the review that picks a path

The tutorials show this with a review: one node finds the sentiment, and the edge sends a happy review to a thank-you node and an unhappy one to a support node. Same idea as our gate: plain code reads the state and chooses the track.

## Where people get stuck

- The edge function **returns a name**, not a result. `"writeTweet"` or `END`.
- Give the **path list** (`["writeTweet", END]`). Without it the drawing guesses and shows a line to every node.
- The gate is **code, not a model call**. Counting bullets is free and never wrong.
- A gate only works if the first node has a **strict format** to check.

## Say it back

Try it in one sentence before you read mine:

> In a graph, a chain is nodes passing data through the state, and a conditional edge is the plain-code gate that picks the next node or ends the run.

## What's next

In the playground, a topic becomes an outline, the gate checks it, then a tweet. Watch the dotted line in the drawing: that's the conditional edge. Next lesson: an edge with three tracks to choose from.

```playground
lg-chain
```
