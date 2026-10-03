import { LogOutIcon } from "lucide-react";
import type { Metadata } from "next";
import { logout } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin-nav";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdminPage } from "../_lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdminPage();

  return (
    <div className="min-h-dvh">
      {/* The blur sits on a pseudo-element: backdrop-filter on the header itself would pin the
          phone tab bar (position: fixed, inside AdminNav) to the header instead of the viewport. */}
      <header className="sticky top-0 z-40 border-b border-border/60 before:absolute before:inset-0 before:-z-10 before:bg-background/80 before:backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <BrandMark className="shrink-0">
            <span className="font-mono text-xs font-normal tracking-widest text-muted-foreground uppercase">
              Admin
            </span>
          </BrandMark>
          <AdminNav />
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 hidden text-sm text-muted-foreground lg:inline">
              {admin.email}
            </span>
            <ThemeToggle />
            <form action={logout}>
              <SubmitButton
                variant="ghost"
                aria-label="Log out"
                className="max-sm:w-10 max-sm:px-0"
                pendingText="…"
              >
                <LogOutIcon aria-hidden />
                <span className="hidden sm:inline">Log out</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      {/* Bottom padding keeps content clear of the phone tab bar. */}
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-12">
        {children}
      </main>
    </div>
  );
}
