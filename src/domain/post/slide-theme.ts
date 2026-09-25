import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1a2b3c");

export const slideColorsSchema = z.object({ background: hex, text: hex, accent: hex });
export type SlideColors = z.infer<typeof slideColorsSchema>;

export interface SlideTheme {
  id: string;
  name: string;
  colors: SlideColors;
}

/** Preset looks. Each meets the text contrast minimum (see slide-theme.test.ts). */
export const SLIDE_THEMES: readonly SlideTheme[] = [
  {
    id: "midnight",
    name: "Midnight",
    colors: { background: "#0b1020", text: "#e8ecf7", accent: "#8b9cff" },
  },
  {
    id: "paper",
    name: "Paper",
    colors: { background: "#f6f1e7", text: "#1f1b16", accent: "#c2410c" },
  },
  {
    id: "terminal",
    name: "Terminal",
    colors: { background: "#0d1117", text: "#d1e4d8", accent: "#3fb950" },
  },
  {
    id: "dusk",
    name: "Dusk",
    colors: { background: "#2a1b3d", text: "#f8ecf6", accent: "#ff8f70" },
  },
  {
    id: "mint",
    name: "Mint",
    colors: { background: "#eaf7f0", text: "#0f3d2e", accent: "#0e9f6e" },
  },
  {
    id: "minimal",
    name: "Minimal",
    colors: { background: "#ffffff", text: "#111111", accent: "#2563eb" },
  },
];

export const DEFAULT_SLIDE_COLORS: SlideColors = SLIDE_THEMES[0]!.colors;

/** WCAG 2.x: body text needs at least 4.5:1 against its background. */
export const MIN_TEXT_CONTRAST = 4.5;

function rgb(hexColor: string): [number, number, number] {
  const n = Number.parseInt(hexColor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hexColor: string): number {
  const [r, g, b] = rgb(hexColor).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `rgba()` for a hex colour: the image renderer's colour support is safest with rgba. */
export function withAlpha(hexColor: string, alpha: number): string {
  const [r, g, b] = rgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
