import { describe, expect, test } from "vitest";
import { AMOUNT_MASK, maskDigits, maskParts } from "./mask-amount";

function part(type: Intl.NumberFormatPartTypes, value: string): Intl.NumberFormatPart {
  return { type, value };
}

describe("maskParts", () => {
  test("keeps the sign and the currency and masks the number once", () => {
    expect(
      maskParts([
        part("minusSign", "-"),
        part("currency", "€"),
        part("integer", "1"),
        part("group", ","),
        part("integer", "234"),
        part("decimal", "."),
        part("fraction", "50"),
      ]),
    ).toBe(`-€${AMOUNT_MASK}`);
  });

  test("keeps a trailing currency and the literal before it", () => {
    expect(
      maskParts([
        part("integer", "12"),
        part("decimal", ","),
        part("fraction", "00"),
        part("literal", " "),
        part("currency", "€"),
      ]),
    ).toBe(`${AMOUNT_MASK} €`);
  });

  test("swallows the literals inside the run, a compact suffix included", () => {
    expect(
      maskParts([
        part("integer", "1"),
        part("decimal", ","),
        part("fraction", "2"),
        part("literal", " "),
        part("compact", "tūkst."),
        part("literal", " "),
        part("currency", "€"),
      ]),
    ).toBe(`${AMOUNT_MASK} €`);
    expect(maskParts([part("currency", "€"), part("integer", "1"), part("compact", "K")])).toBe(
      `€${AMOUNT_MASK}`,
    );
  });

  test("leaves parts without a number alone", () => {
    expect(maskParts([part("currency", "€"), part("nan", "NaN")])).toBe("€NaN");
    expect(maskParts([])).toBe("");
  });
});

describe("maskDigits", () => {
  test("masks every digit run in a sentence, dates included", () => {
    expect(maskDigits("Paid €1,234.50 on 2026-09-30.")).toBe(
      `Paid €${AMOUNT_MASK} on ${AMOUNT_MASK}-${AMOUNT_MASK}-${AMOUNT_MASK}.`,
    );
  });

  test("keeps grouped Lithuanian amounts to one mask", () => {
    expect(maskDigits("Sumokėta 1 234,50 €")).toBe(`Sumokėta ${AMOUNT_MASK} €`);
  });

  test("leaves text without digits unchanged", () => {
    expect(maskDigits("Nothing to hide")).toBe("Nothing to hide");
  });
});
