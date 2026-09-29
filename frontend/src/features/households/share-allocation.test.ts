import { describe, expect, test } from "vitest";
import { fromCents } from "@/lib/money";
import { allocateShares } from "./share-allocation";

function amounts(cents: number[] | null) {
  return cents?.map(fromCents) ?? null;
}

describe("allocateShares", () => {
  test.each([
    ["100.00", 3, ["33.34", "33.33", "33.33"]],
    ["0.01", 3, ["0.01", "0.00", "0.00"]],
    ["0.02", 3, ["0.01", "0.01", "0.00"]],
    ["90.00", 3, ["30.00", "30.00", "30.00"]],
  ])("splits %s equally between %i with the leftover cents first", (total, count, expected) => {
    const parts = Array.from({ length: count }, () => ({}));
    expect(amounts(allocateShares(total, "equal", parts))).toEqual(expected);
  });

  test.each([
    ["100.00", [2, 1, 1], ["50.00", "25.00", "25.00"]],
    ["10.00", [2, 1], ["6.67", "3.33"]],
    ["10.00", [1, 2], ["3.33", "6.67"]],
    ["1.00", [1, 1, 1], ["0.34", "0.33", "0.33"]],
    ["50.00", [2, 0, 1], ["33.33", "0.00", "16.67"]],
    ["0.05", [100, 1], ["0.05", "0.00"]],
  ])("splits %s by weights %j", (total, weights, expected) => {
    const parts = weights.map((weight) => ({ weight }));
    expect(amounts(allocateShares(total, "shares", parts))).toEqual(expected);
  });

  test("refuses weights that are all zero", () => {
    expect(allocateShares("10.00", "shares", [{ weight: 0 }, { weight: 0 }])).toBeNull();
  });

  test.each([
    [["60.00", "40.00"], true],
    [["60.00", "39.99"], false],
    [["60.00", "40.01"], false],
    [["100.00", "0.00"], true],
    [["100,00", ""], false],
  ])("takes exact amounts %j only when they add up", (values, accepted) => {
    const parts = values.map((amount) => ({ amount }));
    expect(allocateShares("100.00", "exact", parts) !== null).toBe(accepted);
  });

  test("always adds up to the amount and stays within a cent of the exact part", () => {
    let seed = 20260929;
    function next(max: number) {
      seed = (seed * 48271) % 2147483647;
      return seed % max;
    }

    for (let run = 0; run < 2000; run += 1) {
      const totalCents = 1 + next(10_000_000);
      const weights = Array.from({ length: 1 + next(11) }, () => 1 + next(100));
      const shares = allocateShares(
        fromCents(totalCents),
        "shares",
        weights.map((weight) => ({ weight })),
      );
      const sum = weights.reduce((total, weight) => total + weight, 0);

      expect(shares?.reduce((total, cents) => total + cents, 0)).toBe(totalCents);
      for (const [index, cents] of (shares ?? []).entries()) {
        expect(Math.abs(cents - (totalCents * (weights[index] ?? 0)) / sum)).toBeLessThan(1);
      }
    }
  });
});
