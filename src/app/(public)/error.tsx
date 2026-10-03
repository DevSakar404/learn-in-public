"use client";

import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">This page couldn&apos;t load. Please try again.</p>
      <Button size="lg" className="px-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
