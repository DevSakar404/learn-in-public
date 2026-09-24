import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-background focus:p-2"
      >
        Skip to content
      </a>
      <header className="border-b">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3"
        >
          <Link href="/" className="font-semibold">
            Learn in Public
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/blog" className="rounded px-3 py-2 hover:bg-muted">
              Blog
            </Link>
            <a href="/rss.xml" className="rounded px-3 py-2 hover:bg-muted">
              RSS
            </a>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Written one day at a time while learning AI engineering.
      </footer>
    </div>
  );
}
