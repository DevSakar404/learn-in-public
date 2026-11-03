"use client";

import { useActionState } from "react";
import { runWorkflow } from "@/app/actions/learn";
import { STATUS_STYLE, useElapsed, Wire, type Status } from "@/components/learn/greet-playground";
import { GraphView } from "@/components/learn/graph-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkflowId, WorkflowStep } from "@/domain/learn/workflow";
import { cn } from "@/lib/utils";

const initialState: Awaited<ReturnType<typeof runWorkflow>> = {};
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** A box shown before the first run, so the reader sees the workflow's shape. */
export interface PlannedStep {
  label: string;
  kind: WorkflowStep["kind"];
}

export interface WorkflowPlaygroundProps {
  id: WorkflowId;
  /** The input box: what the reader types, e.g. "A topic". */
  field: { label: string; placeholder: string };
  /** Lanes in order; steps in one lane run at the same time. */
  shape: PlannedStep[][];
  /** One line under the flow, e.g. how a loop repeats. */
  note?: string;
}

function KindBadge({ kind }: { kind: WorkflowStep["kind"] }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 font-mono text-[0.7rem]",
        kind === "llm" ? "bg-ember-soft text-ember-text" : "bg-card text-muted-foreground",
      )}
    >
      {kind === "llm" ? "LLM" : "code"}
    </span>
  );
}

function StepBox({ step, active }: { step: PlannedStep | WorkflowStep; active: boolean }) {
  const ran = "output" in step;
  return (
    <li
      className={cn(
        "min-w-0 flex-1 rounded-xl border p-3 transition-colors",
        step.kind === "llm" ? "bg-ember-surface" : "border-dashed",
        active ? "border-ember" : "border-ember-line",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{step.label}</p>
        <KindBadge kind={step.kind} />
      </div>
      {ran && (
        <>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{step.output}</p>
          {step.kind === "llm" && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground marker:text-ember-text focus-visible:outline-2 focus-visible:outline-ember">
                Sent to the model ·{" "}
                <span className="tabular-nums">
                  {step.usage.inputTokens} in, {step.usage.outputTokens} out ·{" "}
                  {seconds(step.latencyMs)}
                </span>
              </summary>
              <ol className="mt-2 space-y-2">
                {step.messages.map((m, i) => (
                  <li key={i}>
                    <p className="font-medium text-ember-text">{m.role}</p>
                    <pre className="mt-1 rounded-lg bg-card p-2 font-mono leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </pre>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </>
      )}
    </li>
  );
}

/** Steps grouped by lane, lanes in order. */
function lanesOf(steps: WorkflowStep[]): WorkflowStep[][] {
  const lanes: WorkflowStep[][] = [];
  for (const step of steps) (lanes[step.lane] ??= []).push(step);
  return lanes.filter(Boolean);
}

/** A workflow lesson's playground: one input, then every step of the run as a box in the flow. */
export function WorkflowPlayground({ id, field, shape, note }: WorkflowPlaygroundProps) {
  const [state, action, pending] = useActionState(runWorkflow, initialState);
  const [elapsed, setElapsed] = useElapsed(pending);
  const run = pending ? undefined : state.run;
  const status: Status = pending ? "running" : run ? "done" : state.error ? "failed" : "idle";
  const inputErrors = state.fieldErrors?.input;
  const inputId = `${id}-input`;
  const lanes: (PlannedStep | WorkflowStep)[][] = run ? lanesOf(run.steps) : shape;
  const calls = run?.steps.filter((s) => s.kind === "llm").length ?? 0;

  const statusText = {
    idle: "Waiting",
    running: `Running ${seconds(elapsed)}`,
    done: `Done in ${seconds(run?.latencyMs ?? 0)}`,
    failed: "Failed",
  }[status];

  return (
    <section
      aria-labelledby={`${id}-playground`}
      className="not-prose rounded-2xl border border-ember-line bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-playground`} className="font-display text-2xl font-semibold tracking-tight">
          Flow
        </h2>
        <p role="status" className={cn("text-sm font-medium tabular-nums", STATUS_STYLE[status])}>
          {statusText}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Each run makes real calls to OpenAI. You get 5 runs a minute.
      </p>

      <form action={action} onSubmit={() => setElapsed(0)} className="mt-6" noValidate>
        <input type="hidden" name="id" value={id} />
        <Label htmlFor={inputId} className="text-xs text-muted-foreground">
          {field.label}
        </Label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            name="input"
            defaultValue={state.values?.input}
            key={state.values?.input}
            placeholder={field.placeholder}
            maxLength={200}
            autoComplete="off"
            required
            aria-invalid={!!inputErrors}
            aria-describedby={inputErrors ? `${inputId}-error` : undefined}
          />
          {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
          <div aria-hidden className="absolute -left-[9999px]">
            <label htmlFor={`${id}-website`}>Website</label>
            <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="bg-ember font-semibold text-ember-ink hover:bg-ember-strong"
          >
            {pending ? "Running…" : "Run workflow"}
          </Button>
        </div>
        {inputErrors && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-ember-danger">
            {inputErrors[0]}
          </p>
        )}
      </form>

      {run?.graph && (
        <div className="mt-6">
          <GraphView mermaid={run.graph.mermaid} ran={run.graph.ran} />
        </div>
      )}

      <ol aria-label="Workflow" className="mt-6">
        <li className="mx-auto w-fit max-w-full truncate rounded-full border border-ember-line px-4 py-1.5 font-mono text-xs">
          <span className="font-semibold">START</span>{" "}
          <span className="text-muted-foreground">
            {state.values?.input ? JSON.stringify(state.values.input) : "your input"}
          </span>
        </li>
        {lanes.map((lane, i) => (
          <li key={i}>
            <Wire active={pending} />
            <ol
              aria-label={lane.length > 1 ? "These steps run at the same time" : undefined}
              className="flex flex-col gap-2 sm:flex-row"
            >
              {lane.map((step, j) => (
                <StepBox key={j} step={step} active={pending} />
              ))}
            </ol>
          </li>
        ))}
        <li>
          <Wire active={pending} />
        </li>
        <li aria-live="polite" className="rounded-xl border border-dashed border-ember-line p-4">
          <p className="font-mono text-xs font-semibold">END</p>
          {run ? (
            <>
              <p className="mt-2 font-display text-lg leading-snug whitespace-pre-wrap">
                {run.output}
              </p>
              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                {run.model} · {calls} model {calls === 1 ? "call" : "calls"} ·{" "}
                {run.usage.inputTokens} tokens in, {run.usage.outputTokens} out
              </p>
            </>
          ) : state.error && !inputErrors && !pending ? (
            <p role="alert" className="mt-2 text-sm text-ember-danger">
              {state.error}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Run the workflow to fill this in.</p>
          )}
        </li>
      </ol>
      {note && <p className="mt-3 text-center text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}
