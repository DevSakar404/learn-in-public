import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

/** The site name with its accent dot. Links home. */
export function BrandMark({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span aria-hidden className="size-2 rounded-full bg-brand" />
      {SITE_NAME}
      {children}
    </Link>
  );
}
