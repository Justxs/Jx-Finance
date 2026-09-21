import { describe, expect, test } from "vitest";
import { changeOf } from "./comparison";

describe("changeOf", () => {
  test("without an earlier figure there is nothing to compare", () => {
    expect(changeOf("10.00", null)).toBeNull();
    expect(changeOf("10.00", undefined)).toBeNull();
  });

  test("a rise reports the amount and the share of the earlier figure", () => {
    expect(changeOf("150.00", "100.00")).toEqual({
      current: 150,
      previous: 100,
      amount: 50,
      percent: 0.5,
      direction: "up",
    });
  });

  test("a fall reports a negative amount", () => {
    const change = changeOf("80.00", "100.00");

    expect(change?.amount).toBe(-20);
    expect(change?.percent).toBe(-0.2);
    expect(change?.direction).toBe("down");
  });

  test("an equal figure is flat, not a rise", () => {
    expect(changeOf("100.00", "100.00")?.direction).toBe("flat");
    expect(changeOf("100.00", "100.00")?.percent).toBe(0);
  });

  test("a change from zero has an amount but no percentage", () => {
    const change = changeOf("40.00", "0.00");

    expect(change?.amount).toBe(40);
    expect(change?.percent).toBeNull();
    expect(change?.direction).toBe("up");
  });

  test("a fall to zero is an ordinary minus one hundred percent", () => {
    expect(changeOf("0.00", "40.00")?.percent).toBe(-1);
  });

  test("zero against zero is flat and still has no percentage", () => {
    const change = changeOf("0.00", "0.00");

    expect(change?.amount).toBe(0);
    expect(change?.percent).toBeNull();
    expect(change?.direction).toBe("flat");
  });

  test("a negative earlier figure keeps the sign of the movement", () => {
    expect(changeOf("-10.00", "-20.00")?.amount).toBe(10);
    expect(changeOf("-10.00", "-20.00")?.percent).toBe(0.5);
  });

  test("a missing current figure counts as nothing", () => {
    expect(changeOf(undefined, "25.00")?.amount).toBe(-25);
  });
});
