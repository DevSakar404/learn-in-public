import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(toCsv([["a,b", 'say "hi"', "line\nbreak"]])).toBe(
      '"a,b","say ""hi""","line\nbreak"\r\n',
    );
  });

  it("neutralises spreadsheet formulas", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@x"]])).toBe("'=HYPERLINK(1),'+1,'-2,'@x\r\n");
  });
});
