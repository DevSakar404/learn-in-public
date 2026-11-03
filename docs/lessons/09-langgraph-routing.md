<!--
Topic: LangGraph
Title: LangGraph 3: routing
Summary: One node picks a label, and a conditional edge sends the question to the one node built for it.
Session minutes: 15
YouTube:
-->

---

## The idea in one line

**Routing** in a graph: a classifier node writes a label into the state, and a conditional edge returns that label as the next node's name. Only one route node runs.

## Think of a junction

The train reaches a junction. The points are set by what's on the ticket: billing passengers go one way, technical another, everyone else a third. Each line ends at a station that's good at one thing.

```concepts
Concept | What it is | In the junction
Classifier node | A node that only picks a label and writes it into the state | Reading the ticket's destination
Router | A conditional edge that returns the label as the next node's name | Setting the points
Route node | One node per route, with its own instructions | A station that handles one kind of passenger
Check the label | Parse the label against the list before trusting it | Refusing a ticket for a station that doesn't exist
```

## Warm-up: maths that picks a branch

Before any model, the tutorials route on a number. Work out the discriminant of a quadratic equation: above zero goes to a "two roots" node, zero to "one root", below zero to "no real roots". Same router, and you can test every branch without spending a token.

## Where people get stuck

- The router can only return **names that are in the path list**. Check the model's label against that list first.
- Models answer "Billing." or "I think billing". **Clean** the label before you check it.
- Every route node needs an **edge to END**, or the run has nowhere to go after it.
- Routing is worth it when routes really **need different instructions**. If one prompt handles every case, skip it.

## Say it back

Try it in one sentence before you read mine:

> Routing is a node that writes a label and a conditional edge that turns the label into the next node's name, so only the right specialist runs.

## What's next

In the playground, ask a question and watch one of three route nodes light up in the drawing. Next lesson: three nodes that run at the same time.

```playground
lg-route
```
