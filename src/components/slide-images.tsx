"use client";

import { DownloadIcon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AnyPost } from "@/domain/post/post";
import {
  contrastRatio,
  DEFAULT_SLIDE_COLORS,
  MIN_TEXT_CONTRAST,
  SLIDE_THEMES,
  slideColorsSchema,
  type SlideColors,
} from "@/domain/post/slide-theme";
import { slideDeck } from "@/domain/post/slides";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "slide-colors";

// The admin's last colours, per browser (a convenience, not data). Read via useSyncExternalStore so the
// server render (defaults) and the first client render agree; the saved colours apply right after.
const noSubscribe = () => () => {};
function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function parseColors(raw: string | null): SlideColors | null {
  try {
    const parsed = slideColorsSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const COLOR_FIELDS: { key: keyof SlideColors; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

/** Theme picker + previews + downloads for a saved Instagram or LinkedIn draft. */
export function SlideImages({ post, dirty }: { post: AnyPost; dirty: boolean }) {
  const deck = slideDeck(post);
  const stored = useSyncExternalStore(noSubscribe, readStored, () => null);
  const [picked, setPicked] = useState<SlideColors | null>(null);
  const colors = picked ?? parseColors(stored) ?? DEFAULT_SLIDE_COLORS;
  const [preview, setPreview] = useState<SlideColors | null>(null);
  const previewColors = preview ?? colors;

  const pick = (next: SlideColors) => {
    if (!preview) setPreview(colors); // keep the current images until the new choice settles
    setPicked(next);
  };

  // Colour pickers fire continuously while dragging: only re-render images once the choice settles.
  useEffect(() => {
    if (!picked) return;
    const t = setTimeout(() => {
      setPreview(picked);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(picked));
      } catch {
        // storage unavailable (private mode): the choice just isn't remembered
      }
    }, 350);
    return () => clearTimeout(t);
  }, [picked]);

  if (!deck) return null;

  const activeTheme = SLIDE_THEMES.find((t) =>
    COLOR_FIELDS.every(({ key }) => t.colors[key] === colors[key]),
  );
  const lowContrast = contrastRatio(colors.text, colors.background) < MIN_TEXT_CONTRAST;
  const query = new URLSearchParams({
    ...previewColors,
    v: String(new Date(post.updatedAt).getTime()),
  }).toString();
  const images = deck.slides.map((s, i) => ({
    src: `/admin/drafts/${post.id}/images/${i}?${query}`,
    file: `${post.platform}-${i + 1}.png`,
    alt: `${post.platform === "instagram" ? `Slide ${i + 1} of ${deck.slides.length}` : "LinkedIn image"}: ${s.title}`,
  }));

  const downloadAll = async () => {
    for (const img of images) {
      const a = Object.assign(document.createElement("a"), { href: img.src, download: img.file });
      a.click();
      await new Promise((r) => setTimeout(r, 300)); // browsers drop rapid-fire downloads
    }
  };

  return (
    <section aria-label="Images" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">
          {post.platform === "instagram" ? "Carousel images" : "Post image"}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={downloadAll}>
          <DownloadIcon aria-hidden /> Download{" "}
          {images.length > 1 ? `all (${images.length})` : "image"}
        </Button>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {SLIDE_THEMES.map((theme) => (
            <label
              key={theme.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                activeTheme?.id === theme.id && "border-foreground",
              )}
            >
              <input
                type="radio"
                name={`theme-${post.id}`}
                className="sr-only"
                checked={activeTheme?.id === theme.id}
                onChange={() => pick(theme.colors)}
              />
              <span
                aria-hidden
                className="size-4 rounded-full border"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.background} 50%, ${theme.colors.accent} 50%)`,
                }}
              />
              {theme.name}
            </label>
          ))}
          {!activeTheme && (
            <span className="rounded-full border border-dashed px-3 py-1 text-sm">Custom</span>
          )}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              id={`${post.id}-${key}`}
              type="color"
              value={colors[key]}
              onChange={(e) => pick({ ...colors, [key]: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border bg-transparent"
            />
            <Label htmlFor={`${post.id}-${key}`}>{label}</Label>
            <span className="font-mono text-xs text-muted-foreground">{colors[key]}</span>
          </div>
        ))}
      </div>

      {lowContrast && (
        <p role="alert" className="text-sm text-destructive">
          Text and background are too similar (
          {contrastRatio(colors.text, colors.background).toFixed(1)}:1, aim for 4.5:1 or more). The
          slides may be hard to read on a phone.
        </p>
      )}
      {dirty && (
        <p role="status" className="text-sm text-muted-foreground">
          Images show the last saved version. Save the draft to update them.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <li key={img.src} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNGs from our own route */}
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="w-full rounded-md border bg-muted"
              style={{ aspectRatio: `${deck.width} / ${deck.height}` }}
            />
            <a
              href={img.src}
              download={img.file}
              className="text-xs underline-offset-4 hover:underline"
            >
              Download {img.file}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
