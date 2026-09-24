"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="space-y-4 rounded-xl border border-destructive/40 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        The page failed to load{error.digest ? ` (ref ${error.digest})` : ""}. Check the server
        logs, then try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
