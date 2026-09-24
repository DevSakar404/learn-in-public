import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin-nav";
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
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="font-semibold">
              Learn in Public
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{admin.email}</span>
            <ThemeToggle />
            <form action={logout}>
              <SubmitButton variant="outline" size="sm" pendingText="Logging out…">
                Log out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
