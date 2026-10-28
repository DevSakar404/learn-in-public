"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clock } from "./focus-bar";
import { setActivePage, useFocusState } from "./focus-store";

interface Props {
  /** The post's slug: the post and its playground share one session. */
  slug: string;
  minutes: number;
  next: { title: string; href: string } | null;
}

/** This page's focused session. It starts on its own; FocusBar ticks it. */
export function PageTimer({ slug, minutes, next }: Props) {
  const state = useFocusState();
  const totalMs = minutes * 60_000;
  const nextTitle = next?.title;
  const nextHref = next?.href;

  useEffect(
    () =>
      setActivePage({
        slug,
        totalMs,
        next: nextTitle && nextHref ? { title: nextTitle, href: nextHref } : null,
      }),
    [slug, totalMs, nextTitle, nextHref],
  );

  if (!state || state.off) return null;
  const progress = state.pages[slug] ?? { doneMs: 0, done: false };
  const percent = Math.round((progress.doneMs / totalMs) * 100);
  const onBreak = state.pomodoro.phase === "break";

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium">Focus session · {minutes} min</span>
        {progress.done ? (
          <span className="text-muted-foreground">
            Done ✓
            {next && (
              <>
                {" · Next: "}
                <Link href={next.href} className="text-foreground underline underline-offset-4">
                  {next.title}
                </Link>
              </>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground tabular-nums">
            {onBreak ? "Paused for the break" : `${clock(totalMs - progress.doneMs)} left`}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label="Focus session progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
