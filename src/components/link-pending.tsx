"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/**
 * Put inside a <Link>: a thin accent bar that pulses while that click is pending. For routes that
 * can't have a loading.tsx skeleton (see docs/02-decisions.md). Always rendered, so no layout shift.
 * Positions against the nearest positioned ancestor.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand opacity-0 transition-opacity",
        pending && "animate-pulse opacity-100 motion-reduce:animate-none",
        className,
      )}
    />
  );
}
