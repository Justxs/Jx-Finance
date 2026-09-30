import { describe, expect, test } from "vitest";
import { shareOf } from "./share";

describe("shareOf", () => {
  test("scales bars to the largest absolute amount", () => {
    expect(shareOf([30, -50, 20], String).max).toBe(50);
  });

  test("divides a positive amount by the positive total", () => {
    const { share } = shareOf([30, -50, 10], String);
    expect(share(30)).toBe("0.75");
    expect(share(10)).toBe("0.25");
  });

  test("gives no share to zero or negative amounts", () => {
    const { share } = shareOf([30, -50], String);
    expect(share(0)).toBeNull();
    expect(share(-50)).toBeNull();
  });

  test("is empty without amounts", () => {
    expect(shareOf([], String).max).toBe(0);
  });
});
