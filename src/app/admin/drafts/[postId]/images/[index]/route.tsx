import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { SlideImage } from "@/components/slide-image";
import { slideColorsSchema } from "@/domain/post/slide-theme";
import { slideDeck } from "@/domain/post/slides";
import { container } from "@/lib/container";
import { SITE_NAME } from "@/lib/site";
import { authorize } from "../../../../../_lib/auth";

// Fonts are read once per server instance. next.config.ts traces assets/fonts for deployment.
const fonts = Promise.all(
  (["Regular", "Bold"] as const).map(async (w) => ({
    name: "Geist",
    data: await readFile(join(process.cwd(), `assets/fonts/Geist-${w}.ttf`)),
    weight: w === "Bold" ? (700 as const) : (400 as const),
    style: "normal" as const,
  })),
);

const paramsSchema = z.object({
  postId: z.uuid(),
  index: z.coerce.number().int().min(0),
  colors: slideColorsSchema,
});

/** Admin-only PNG of one slide of a saved draft, e.g. /admin/drafts/<id>/images/0?background=%23…&text=%23…&accent=%23… */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/admin/drafts/[postId]/images/[index]">,
) {
  const auth = await authorize();
  if (!auth.ok) return new Response("Unauthorized", { status: 401 });

  const q = request.nextUrl.searchParams;
  const input = paramsSchema.safeParse({
    ...(await ctx.params),
    colors: { background: q.get("background"), text: q.get("text"), accent: q.get("accent") },
  });
  if (!input.success) return new Response(z.prettifyError(input.error), { status: 400 });

  const post = await (await container.admin.posts()).get(input.data.postId);
  if (!post.ok) return new Response("Draft not found", { status: 404 });
  const deck = slideDeck(post.value);
  const slide = deck?.slides[input.data.index];
  if (!deck || !slide) return new Response("Slide not found", { status: 404 });
  const note = await (await container.admin.notes()).get(post.value.noteId);

  return new ImageResponse(
    <SlideImage
      slide={slide}
      index={input.data.index}
      total={deck.slides.length}
      colors={input.data.colors}
      topic={note.ok ? note.value.topic.name : ""}
      siteName={SITE_NAME}
      width={deck.width}
    />,
    {
      width: deck.width,
      height: deck.height,
      fonts: await fonts,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
