import { z } from "zod";
import { container } from "@/lib/container";

/** Public iCalendar feed, keyed by the secret token (calendar apps can't log in). */
export async function GET(_: Request, ctx: RouteContext<"/calendar/[token]">) {
  const token = z.uuid().safeParse((await ctx.params).token.replace(/\.ics$/, ""));
  if (!token.success) return new Response("Not found", { status: 404 });

  const feed = await container.public.planner().calendarFeed(token.data);
  if (!feed.ok) return new Response("Not found", { status: 404 });
  return new Response(feed.value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="learn-in-public.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
