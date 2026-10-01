import { describe, expect, test } from "vitest";
import { allocationDrift, splitContribution } from "./allocation-split";

function total(split: Map<string, number>) {
  return [...split.values()].reduce((sum, amount) => sum + amount, 0);
}

describe("allocationDrift", () => {
  test("compares each bucket's share of the value with its target", () => {
    const drift = allocationDrift([
      { id: "etf", value: 750, target: 60 },
      { id: "stock", value: 250, target: 40 },
    ]);

    expect(drift).toEqual([
      {
        id: "etf",
        value: 750,
        target: 60,
        share: 0.75,
        targetShare: 0.6,
        drift: expect.closeTo(0.15),
      },
      {
        id: "stock",
        value: 250,
        target: 40,
        share: 0.25,
        targetShare: 0.4,
        drift: expect.closeTo(-0.15),
      },
    ]);
  });

  test("gives every bucket a share of zero when nothing is held", () => {
    expect(allocationDrift([{ id: "bond", value: 0, target: 100 }])).toEqual([
      { id: "bond", value: 0, target: 100, share: 0, targetShare: 1, drift: -1 },
    ]);
  });
});

describe("splitContribution", () => {
  test("puts the whole amount into the bucket below target when it lands exactly on target", () => {
    const split = splitContribution(
      [
        { id: "etf", value: 600, target: 50 },
        { id: "stock", value: 400, target: 50 },
      ],
      20_000,
    );

    expect([...split]).toEqual([["stock", 20_000]]);
  });

  test("gives nothing to a bucket already over its target and lifts the others together", () => {
    const split = splitContribution(
      [
        { id: "etf", value: 800, target: 50 },
        { id: "stock", value: 100, target: 25 },
        { id: "bond", value: 100, target: 25 },
      ],
      20_000,
    );

    expect(split.has("etf")).toBe(false);
    expect(split.get("stock")).toBe(10_000);
    expect(split.get("bond")).toBe(10_000);
  });

  test("sends an amount too small to reach any target to the bucket furthest below it", () => {
    const buckets = [
      { id: "etf", value: 500, target: 40 },
      { id: "stock", value: 300, target: 40 },
      { id: "bond", value: 200, target: 20 },
    ];

    const split = splitContribution(buckets, 1000);
    const after = allocationDrift(
      buckets.map((bucket) => ({
        ...bucket,
        value: bucket.value + (split.get(bucket.id) ?? 0) / 100,
      })),
    );

    const stock = after.find((bucket) => bucket.id === "stock");

    expect([...split]).toEqual([["stock", 1000]]);
    expect(stock?.share).toBeLessThan(stock?.targetShare ?? 0);
  });

  test("brings every bucket to its target when no bucket is over it", () => {
    const split = splitContribution(
      [
        { id: "etf", value: 300, target: 60 },
        { id: "stock", value: 100, target: 40 },
      ],
      60_000,
    );

    expect(split.get("etf")).toBe(30_000);
    expect(split.get("stock")).toBe(30_000);
  });

  test("funds a bucket that has a target but nothing held yet", () => {
    const split = splitContribution(
      [
        { id: "etf", value: 900, target: 90 },
        { id: "bond", value: 0, target: 10 },
      ],
      5000,
    );

    expect([...split]).toEqual([["bond", 5000]]);
  });

  test("rounds to cents with the remainder going to the largest fractions, summing to the amount", () => {
    const split = splitContribution(
      [
        { id: "a", value: 0, target: 33.34 },
        { id: "b", value: 0, target: 33.33 },
        { id: "c", value: 0, target: 33.33 },
      ],
      10_001,
    );

    expect(total(split)).toBe(10_001);
    expect(split.get("a")).toBe(3335);
    expect(split.get("b")! + split.get("c")!).toBe(6666);
  });

  test("keeps the sum exact over uneven values and odd amounts", () => {
    const buckets = [
      { id: "etf", value: 1234.56, target: 37.5 },
      { id: "stock", value: 987.65, target: 22.25 },
      { id: "bond", value: 13.1, target: 30.25 },
      { id: "crypto", value: 777.77, target: 10 },
    ];

    for (const amount of [1, 7, 99, 12_345, 1_000_001]) {
      expect(total(splitContribution(buckets, amount))).toBe(amount);
    }
  });

  test("never funds a bucket whose target is zero", () => {
    const split = splitContribution(
      [
        { id: "etf", value: 0, target: 100 },
        { id: "stock", value: 0, target: 0 },
      ],
      500,
    );

    expect([...split]).toEqual([["etf", 500]]);
  });

  test("answers nothing for no amount or no targets", () => {
    const buckets = [{ id: "etf", value: 10, target: 100 }];

    expect(splitContribution(buckets, 0).size).toBe(0);
    expect(splitContribution(buckets, -100).size).toBe(0);
    expect(splitContribution([{ id: "etf", value: 10, target: 0 }], 100).size).toBe(0);
  });
});
