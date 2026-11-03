"use client";

import {
  CalendarCheckIcon,
  LayoutDashboardIcon,
  NotebookPenIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/planner", label: "Planner", icon: CalendarCheckIcon },
  { href: "/admin/notes", label: "Notes", icon: NotebookPenIcon },
  { href: "/admin/topics", label: "Topics", icon: TagsIcon },
  { href: "/admin/subscribers", label: "Subscribers", icon: UsersIcon },
] as const;

/** A bottom tab bar on phones, an inline row in the header from md up. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md",
        "md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
      )}
    >
      <ul className="grid grid-cols-5 md:flex md:gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "md:h-auto md:flex-row md:rounded-md md:px-3 md:py-1.5 md:text-sm md:font-normal md:hover:bg-muted",
                  active && "text-foreground md:bg-muted md:font-medium",
                )}
              >
                <Icon className={cn("size-5 md:hidden", active && "text-brand")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
