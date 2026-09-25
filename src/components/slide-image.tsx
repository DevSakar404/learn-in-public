import type { SlideColors } from "@/domain/post/slide-theme";
import { withAlpha } from "@/domain/post/slide-theme";
import type { Slide } from "@/domain/post/slides";

interface Props {
  slide: Slide;
  index: number;
  total: number;
  colors: SlideColors;
  topic: string;
  siteName: string;
  /** Scales type for the canvas width (1080 portrait vs 1200 square). */
  width: number;
}

/** Title size by length, so a 200-character LinkedIn hook still fits. */
function titleSize(slide: Slide): number {
  const base = slide.kind === "cover" ? 92 : slide.kind === "closing" ? 76 : 68;
  const n = slide.title.length;
  return n <= 45
    ? base
    : n <= 90
      ? Math.round(base * 0.8)
      : n <= 140
        ? Math.round(base * 0.66)
        : Math.round(base * 0.56);
}

/**
 * The slide design, rendered to PNG by next/og (Satori): flexbox and inline styles only.
 * Every element with more than one child needs `display: flex`.
 */
export function SlideImage({ slide, index, total, colors, topic, siteName, width }: Props) {
  const u = width / 1080; // 1 design unit at 1080px wide
  const px = (n: number) => Math.round(n * u);
  const isCover = slide.kind === "cover";
  const isClosing = slide.kind === "closing";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: px(96),
        backgroundColor: colors.background,
        backgroundImage: `radial-gradient(circle at 92% 4%, ${withAlpha(colors.accent, 0.28)} 0%, transparent 42%), radial-gradient(circle at 0% 100%, ${withAlpha(colors.accent, 0.14)} 0%, transparent 38%)`,
        color: colors.text,
        fontFamily: "Geist",
      }}
    >
      {/* Header: topic pill + counter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            padding: `${px(10)}px ${px(26)}px`,
            borderRadius: 999,
            border: `${px(2)}px solid ${withAlpha(colors.accent, 0.7)}`,
            color: colors.accent,
            fontSize: px(28),
            fontWeight: 700,
            letterSpacing: px(1),
          }}
        >
          {topic}
        </div>
        {total > 1 && (
          <div style={{ display: "flex", fontSize: px(28), color: withAlpha(colors.text, 0.55) }}>
            {`${index + 1} / ${total}`}
          </div>
        )}
      </div>

      {/* Main */}
      <div
        style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}
      >
        {isCover ? (
          <div
            style={{
              display: "flex",
              width: px(110),
              height: px(12),
              borderRadius: px(6),
              backgroundColor: colors.accent,
              marginBottom: px(48),
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: px(44),
              fontWeight: 700,
              color: colors.accent,
              marginBottom: px(28),
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: px(titleSize(slide)),
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: px(isCover ? -2.5 : -1.5),
          }}
        >
          {slide.title}
        </div>
        {slide.body && (
          <div
            style={{
              display: "flex",
              marginTop: px(isCover ? 44 : 36),
              fontSize: px(isCover ? 40 : 42),
              lineHeight: 1.45,
              color: withAlpha(colors.text, isCover ? 0.72 : 0.85),
            }}
          >
            {slide.body}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: px(32),
          borderTop: `${px(2)}px solid ${withAlpha(colors.text, 0.12)}`,
          fontSize: px(28),
        }}
      >
        <div style={{ display: "flex", fontWeight: 700 }}>{siteName}</div>
        {total > 1 && (isCover || !isClosing) && (
          <div style={{ display: "flex", color: colors.accent, fontWeight: 700 }}>
            {isCover ? "Swipe →" : "→"}
          </div>
        )}
        {isClosing && (
          <div style={{ display: "flex", color: colors.accent, fontWeight: 700 }}>
            Save for later
          </div>
        )}
      </div>
    </div>
  );
}
