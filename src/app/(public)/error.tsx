"use client";

import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">This page couldn&apos;t load. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
