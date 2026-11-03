<!--
Topic: LangGraph
Title: LangGraph 5: orchestrator-workers with Send
Summary: A planner node writes the subtasks, Send starts one worker per subtask, and a reducer collects their results.
Session minutes: 20
YouTube:
-->

---

## The idea in one line

In lesson 4 you drew every parallel node yourself. Here the model writes the plan at run time, and **`Send`** starts the **same worker node once per subtask**, each with its own input. A **reducer** collects the results.

## Think of a dispatcher

At the depot, a dispatcher reads today's orders and sends out as many vans as there are orders. It's always the same kind of van, each with its own address. When every van is back, one person writes the day's report.

```concepts
Concept | What it is | At the depot
Orchestrator | A node where the model plans the subtasks and writes them into the state | The dispatcher reading the orders
Send | Returned from a conditional edge, it runs a node with its own small input | Sending one van to one address
Worker | One node that `Send` runs once per subtask | The same kind of van, many trips
Reducer | A merge rule on a field, here: add each worker's results to the list | Every van dropping its receipt in one tray
Synthesizer | One node that runs after all workers and combines their results | The person writing the day's report
```

## Where people get stuck

- A worker gets **only what you put in its `Send`**, not the whole state. Pass everything it needs.
- Without a **reducer**, many workers writing `results` in one step is an error. With one, their lists are joined.
- **Cap the plan**. The model might plan ten subtasks, and every worker is a paid call.
- Give the conditional edge the path list `["worker"]`, or the drawing shows lines to every node.

## Say it back

Try it in one sentence before you read mine:

> A planner writes the subtasks, a conditional edge returns one Send per subtask to run the same worker with its own input, and a reducer gathers what they return.

## What's next

In the playground, a goal becomes 2 or 3 subtasks and the drawing shows one worker node that ran several times. Next lesson: a loop that grades its own work.

```playground
lg-orchestrate
```
