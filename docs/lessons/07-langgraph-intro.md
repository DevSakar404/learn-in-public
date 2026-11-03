<!--
Topic: LangGraph
Title: LangGraph 1: a graph with one node
Summary: The same one-call greeter as LangChain lesson 1, built as a graph: state, a node, edges from START to END.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

A **graph** is your workflow drawn as a map: **nodes** do the work, **edges** say what runs next, and the **state** is the data that travels along.

LangChain lessons 2–6 joined calls with plain code. LangGraph lets you draw the same steps as a graph, so the framework runs them, can show you the path, and later can pause, resume and loop.

## Think of a train line

A ticket goes in at the first station. At each station, someone stamps something new on it. The tracks decide which station comes next. At the last station, you read everything stamped on the ticket.

```concepts
Concept | What it is | On the train line
State | The data every node reads and writes, described with Zod in a `StateSchema` | The ticket
Node | A function: state in, only the changed fields out | A station that stamps the ticket
Edge | A link that says which node runs next | A track between two stations
START and END | Where every run begins and stops | The first and last station
Compile | Checks the wiring and gives you a graph you can run | The safety check before the line opens
Invoke | Runs the graph with a starting state and returns the final state | Sending one passenger down the line
```

## Warm-up: a graph with no model

The tutorials I'm following start with a graph that has no LLM (large language model) in it at all. One node works out a BMI from weight and height, a second node turns the number into a label. Two stations, one ticket, no API key.

It's worth doing once. It shows the graph is just your functions in an order, and the model is only one thing a node can call.

## Where people get stuck

- A node returns **only the fields it changed**. LangGraph merges them into the state. You don't copy the whole state back.
- A node's **name can't be the same as a state key**. If the state has `greeting`, call the node `greet`. LangGraph.js throws otherwise.
- Nothing runs until you **compile** and **invoke**. Building the graph only describes it.
- A one-node graph is more code than one call. The payoff comes in the next lessons, when the edges start making choices.

## Say it back

Try it in one sentence before you read mine:

> A LangGraph graph is a map of nodes joined by edges, and one state object travels from START to END while each node writes its part.

## What's next

In the playground, your name goes in as the state and one node greets you. LangGraph draws the graph and outlines the node that ran. Next lesson: a second node, and an edge that can stop the line.

```playground
lg-greet
```
