import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        This page doesn&apos;t exist, or the note isn&apos;t published yet.
      </p>
      <Link href="/blog" className="underline underline-offset-4">
        Read the latest notes
      </Link>
    </main>
  );
}
