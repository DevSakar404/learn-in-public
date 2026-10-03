import { RssIcon } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-2 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4 sm:px-6"
        >
          <BrandMark />
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/blog"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              Notes
            </Link>
            <Button variant="ghost" size="icon" asChild>
              <a href="/rss.xml" aria-label="RSS feed">
                <RssIcon aria-hidden />
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        {children}
      </main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Written one day at a time while learning AI engineering.</p>
          <div className="flex gap-4">
            <Link href="/blog" className="transition-colors hover:text-foreground">
              Notes
            </Link>
            <a href="/rss.xml" className="transition-colors hover:text-foreground">
              RSS
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
