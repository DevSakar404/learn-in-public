"use client";

import { useActionState, useEffect, useState } from "react";
import { runGreet } from "@/app/actions/learn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "done" | "failed";
const initialState: Awaited<ReturnType<typeof runGreet>> = {};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/** Live stopwatch while `running` is true (bamboo harness NodeTimer idea). */
function useElapsed(running: boolean) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const id = setInterval(() => setMs(performance.now() - start), 100);
    return () => clearInterval(id);
  }, [running]);
  return [ms, setMs] as const;
}

/** The line between two steps of the pipeline. A dot travels down it while the node runs. */
function Wire({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="relative ml-[1.375rem] h-7 w-px bg-ember-text/50">
      {active && (
        <span className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-ember motion-safe:animate-[wire_0.8s_linear_infinite]" />
      )}
    </div>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  idle: "text-muted-foreground",
  running: "text-ember-text",
  done: "text-ember-ok",
  failed: "text-ember-danger",
};

/** Lesson 1 playground: runs greetNode (one LangChain call to OpenAI) and shows what went in and out. */
export function GreetPlayground() {
  const [state, action, pending] = useActionState(runGreet, initialState);
  const [elapsed, setElapsed] = useElapsed(pending);
  const result = state.greeting;
  const status: Status = pending ? "running" : result ? "done" : state.error ? "failed" : "idle";
  const nameErrors = state.fieldErrors?.name;

  const statusText = {
    idle: "Waiting",
    running: `Running ${seconds(elapsed)}`,
    done: `Done in ${seconds(result?.latencyMs ?? 0)}`,
    failed: "Failed",
  }[status];

  return (
    <section
      aria-labelledby="greet-playground"
      className="not-prose my-10 rounded-2xl border border-ember-line bg-card p-5 sm:p-6"
    >
      <h2 id="greet-playground" className="font-display text-2xl font-semibold tracking-tight">
        Playground
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Runs <code className="font-mono text-ember-text">greetNode</code> with a real call to
        OpenAI. You get 5 runs a minute.
      </p>

      <form action={action} onSubmit={() => setElapsed(0)} className="mt-6" noValidate>
        <Label htmlFor="greet-name" className="text-xs text-muted-foreground">
          Your name <span className="font-mono">(state.name)</span>
        </Label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <Input
            id="greet-name"
            name="name"
            defaultValue={state.values?.name}
            key={state.values?.name}
            placeholder="Your name"
            maxLength={40}
            autoComplete="given-name"
            required
            aria-invalid={!!nameErrors}
            aria-describedby={nameErrors ? "greet-name-error" : undefined}
          />
          {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
          <div aria-hidden className="absolute -left-[9999px]">
            <label htmlFor="greet-website">Website</label>
            <input id="greet-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="bg-ember font-semibold text-ember-ink hover:bg-ember-strong"
          >
            {pending ? "Running…" : "Run node"}
          </Button>
        </div>
        {nameErrors && (
          <p id="greet-name-error" role="alert" className="mt-1.5 text-sm text-ember-danger">
            {nameErrors[0]}
          </p>
        )}
      </form>

      <Wire active={pending} />

      <div
        className={cn(
          "rounded-xl border bg-ember-surface p-4 transition-colors",
          pending ? "border-ember" : "border-ember-line",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-sm font-semibold">greetNode</p>
          <p role="status" className={cn("text-sm font-medium tabular-nums", STATUS_STYLE[status])}>
            {statusText}
          </p>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-card px-2 py-1 font-mono">ChatPromptTemplate</span>
          <span aria-label="piped into">|</span>
          <span className="rounded-md bg-card px-2 py-1 font-mono">ChatOpenAI</span>
        </p>
      </div>

      <Wire active={pending} />

      <div aria-live="polite">
        <p className="font-mono text-xs text-muted-foreground">state.greeting</p>
        {result ? (
          <p className="mt-1.5 font-display text-xl leading-snug">{result.greeting}</p>
        ) : state.error && !nameErrors ? (
          <p role="alert" className="mt-1.5 text-sm text-ember-danger">
            {state.error}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Type your name and run the node to fill this in.
          </p>
        )}
      </div>

      {result && (
        <details className="group mt-6 rounded-xl border border-ember-line">
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-sm font-medium marker:text-ember-text focus-visible:outline-2 focus-visible:outline-ember">
            Sent to the model
            <span className="font-normal text-muted-foreground">{result.model}</span>
            <span className="font-normal text-muted-foreground tabular-nums">
              {result.usage.inputTokens} tokens in, {result.usage.outputTokens} out
            </span>
          </summary>
          <ol className="space-y-3 px-4 pb-4">
            {result.messages.map((m, i) => (
              <li key={i}>
                <p className="text-xs font-medium text-ember-text">{m.role}</p>
                <pre className="mt-1 rounded-lg bg-ember-surface p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </pre>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
