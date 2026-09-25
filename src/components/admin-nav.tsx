"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/planner", label: "Planner" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/topics", label: "Topics" },
  { href: "/admin/subscribers", label: "Subscribers" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1 text-sm">
      {LINKS.map(({ href, label }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("rounded-md px-3 py-2 hover:bg-muted", active && "bg-muted font-medium")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
