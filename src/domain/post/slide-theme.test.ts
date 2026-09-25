import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  MIN_TEXT_CONTRAST,
  SLIDE_THEMES,
  slideColorsSchema,
  withAlpha,
} from "./slide-theme";

describe("slide themes", () => {
  it("computes WCAG contrast", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it.each(SLIDE_THEMES.map((t) => [t.name, t] as const))("%s has readable text", (_, theme) => {
    expect(contrastRatio(theme.colors.text, theme.colors.background)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it("only accepts 6-digit hex colours", () => {
    expect(
      slideColorsSchema.safeParse({ background: "#0b1020", text: "#FFFFFF", accent: "#abcdef" })
        .success,
    ).toBe(true);
    expect(
      slideColorsSchema.safeParse({ background: "red", text: "#fff", accent: "#abcdef" }).success,
    ).toBe(false);
  });

  it("converts hex to rgba", () => {
    expect(withAlpha("#8b9cff", 0.25)).toBe("rgba(139, 156, 255, 0.25)");
  });
});
