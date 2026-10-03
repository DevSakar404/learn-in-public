import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Building blocks for route `loading.tsx` files. Each mirrors the real component's layout
 * (same widths and breakpoints) so the page doesn't jump when content streams in.
 */

/** Wraps a whole loading screen: announced once to screen readers, hidden visually. */
export function LoadingRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div aria-hidden className={className}>
        {children}
      </div>
    </div>
  );
}

/** Lines of body text; the last one is shorter, like a real paragraph. */
export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Mirrors NoteList + NoteCard. */
export function NoteListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="-mt-6 divide-y divide-border/70">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-2.5 py-6 sm:grid-cols-[8.5rem_1fr] sm:gap-6">
          <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:pt-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className={cn("h-5", i % 2 ? "w-3/5" : "w-4/5")} />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mirrors PageHeader. */
export function PageHeaderSkeleton({
  description = true,
  actions = 0,
}: {
  description?: boolean;
  actions?: number;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-40 sm:h-9" />
        {description && <Skeleton className="h-4 w-48" />}
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Mirrors the dashboard / planner stat Cards. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-xl p-4 ring-1 ring-foreground/10", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-12" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Mirrors a shadcn Table whose secondary columns hide on phones. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  const extra = Math.max(columns - 2, 0);
  return (
    <div className="divide-y">
      <div className="flex h-10 items-center gap-4 px-2">
        <Skeleton className="h-4 w-16 flex-1 sm:flex-none" />
        {Array.from({ length: extra }, (_, i) => (
          <Skeleton key={i} className="hidden h-4 w-16 sm:block" />
        ))}
        <Skeleton className="h-4 w-14 sm:ml-auto" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-start gap-4 px-2 py-3 sm:items-center">
          <div className="flex-1 space-y-2">
            <Skeleton className={cn("h-4", i % 3 === 1 ? "w-2/3" : "w-4/5", "sm:w-3/5")} />
            <Skeleton className="h-3 w-28 sm:hidden" />
          </div>
          {Array.from({ length: extra }, (_, j) => (
            <Skeleton key={j} className="hidden h-4 w-20 sm:block" />
          ))}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A label + input pair. */
export function FieldSkeleton({ className, tall = false }: { className?: string; tall?: boolean }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className={cn("w-full rounded-lg", tall ? "h-16" : "h-8")} />
    </div>
  );
}

/** A bordered panel (planner sections, topic form, draft studio). */
export function PanelSkeleton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-4 rounded-xl border bg-card p-4 sm:p-6", className)}>
      {children}
    </div>
  );
}
