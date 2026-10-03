import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <p className="font-mono text-xs tracking-widest text-brand uppercase">404</p>
      <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">Page not found</h1>
      <p className="text-muted-foreground">
        This page doesn&apos;t exist, or the note isn&apos;t published yet.
      </p>
      <Button asChild size="lg" className="px-4">
        <Link href="/blog">Read the latest notes</Link>
      </Button>
    </main>
  );
}
