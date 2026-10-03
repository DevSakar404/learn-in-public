"use client";

import {
  CalendarCheckIcon,
  LayoutDashboardIcon,
  NotebookPenIcon,
  TagsIcon,
  UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/planner", label: "Planner", icon: CalendarCheckIcon },
  { href: "/admin/notes", label: "Notes", icon: NotebookPenIcon },
  { href: "/admin/topics", label: "Topics", icon: TagsIcon },
  { href: "/admin/subscribers", label: "Subscribers", icon: UsersIcon },
] as const;

/**
 * Inside a nav Link: icon + label, plus a fixed-size bar that lights up while the click is pending
 * (before the route's loading skeleton takes over; matters when prefetching hasn't finished).
 */
function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand opacity-0 transition-opacity md:inset-x-2 md:top-auto md:-bottom-2.5",
          pending && "animate-pulse opacity-100 motion-reduce:animate-none",
        )}
      />
      <Icon className={cn("size-5 md:hidden", (active || pending) && "text-brand")} aria-hidden />
      {label}
    </>
  );
}

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
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground",
                  "md:h-auto md:flex-row md:rounded-md md:px-3 md:py-1.5 md:text-sm md:font-normal md:hover:bg-muted",
                  active && "text-foreground md:bg-muted md:font-medium",
                )}
              >
                <NavItem icon={Icon} label={label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
