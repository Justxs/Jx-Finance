import { describe, expect, test } from "vitest";
import { keptShare } from "./kept-share";

describe("keptShare", () => {
  test("is the share of income kept when the month ended with money left", () => {
    expect(keptShare("2000.00", "500.00")).toEqual({ kept: true, share: 0.25 });
  });

  test("is the share of income spent when more went out than came in", () => {
    expect(keptShare("1000.00", "-200.00")).toEqual({ kept: false, share: 1.2 });
  });

  test("has no share without income", () => {
    expect(keptShare("0.00", "-80.00")).toBeNull();
  });
});
