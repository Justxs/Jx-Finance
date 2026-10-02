import { describe, expect, it } from "vitest";
import { fromCents, toCents } from "@/lib/money";
import { spreadFrom, spreadPartWithin, spreadSlices, spreadUntil } from "./spread-slices";

describe("spreadSlices", () => {
  it.each([
    ["360.00", 12],
    ["100.00", 3],
    ["0.10", 12],
    ["1000.01", 7],
    ["0.01", 36],
    ["99999.99", 36],
  ])("cuts %s into %i slices that add up and differ by at most a cent", (amount, months) => {
    const slices = spreadSlices("2026-01-15", amount, months);
    const cents = slices.map((slice) => slice.cents);

    expect(slices).toHaveLength(months);
    expect(fromCents(cents.reduce((sum, value) => sum + value, 0))).toBe(
      fromCents(toCents(amount)),
    );
    expect(Math.min(...cents)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...cents) - Math.min(...cents)).toBeLessThanOrEqual(1);
  });

  it("hands ten cents over twelve months to the first ten", () => {
    expect(spreadSlices("2026-01-01", "0.10", 12).map((slice) => slice.cents)).toEqual([
      ...Array.from({ length: 10 }, () => 1),
      0,
      0,
    ]);
  });

  it("falls on the same day of each following month", () => {
    const slices = spreadSlices("2026-01-15", "360.00", 12);

    expect(slices.map((slice) => slice.date)).toEqual(
      Array.from({ length: 12 }, (_, index) => `2026-${String(index + 1).padStart(2, "0")}-15`),
    );
    expect(slices.every((slice) => slice.cents === 3000)).toBe(true);
  });

  it.each([
    [2027, "28"],
    [2028, "29"],
  ])("clamps the thirty-first of January to the end of February in %i", (year, lastDay) => {
    expect(spreadSlices(`${year}-01-31`, "30.00", 3).map((slice) => slice.date)).toEqual([
      `${year}-01-31`,
      `${year}-02-${lastDay}`,
      `${year}-03-31`,
    ]);
  });

  it("reaches three years ahead over thirty-six months", () => {
    const slices = spreadSlices("2026-03-10", "3600.00", 36);

    expect(slices).toHaveLength(36);
    expect(slices.at(-1)?.date).toBe("2029-02-10");
    expect(slices.every((slice) => slice.cents === 10_000)).toBe(true);
  });
});

describe("spreadSlices backward", () => {
  it("ends with the payment's month for a bill paid in arrears", () => {
    expect(spreadSlices("2026-04-10", "90.00", 3, "backward")).toEqual([
      { date: "2026-02-10", cents: 3000 },
      { date: "2026-03-10", cents: 3000 },
      { date: "2026-04-10", cents: 3000 },
    ]);
  });

  it("clamps the thirty-first of March to the end of February", () => {
    expect(spreadSlices("2026-03-31", "30.00", 3, "backward").map((slice) => slice.date)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(spreadSlices("2028-03-31", "30.00", 2, "backward").map((slice) => slice.date)).toEqual([
      "2028-02-29",
      "2028-03-31",
    ]);
  });

  it("gives the leftover cents to the earliest months", () => {
    expect(spreadSlices("2026-04-10", "100.00", 3, "backward").map((slice) => slice.cents)).toEqual(
      [3334, 3333, 3333],
    );
  });

  it("reaches back across the year", () => {
    const slices = spreadSlices("2026-01-15", "360.00", 12, "backward");

    expect(slices[0]?.date).toBe("2025-02-15");
    expect(slices.at(-1)?.date).toBe("2026-01-15");
  });
});

describe("spreadSlices of a refund", () => {
  it.each(["forward", "backward"] as const)(
    "keeps the minus sign on every %s slice and adds up to the refund",
    (direction) => {
      const slices = spreadSlices("2026-04-10", "-100.00", 3, direction);
      const cents = slices.map((slice) => slice.cents);

      expect(cents).toEqual([-3334, -3333, -3333]);
      expect(fromCents(cents.reduce((sum, value) => sum + value, 0))).toBe("-100.00");
    },
  );
});

describe("spreadFrom and spreadUntil", () => {
  it.each([
    ["2026-01-15", 12, "forward", "2026-01-15", "2026-12-15"],
    ["2026-01-15", 12, "backward", "2025-02-15", "2026-01-15"],
    ["2026-04-10", 3, "backward", "2026-02-10", "2026-04-10"],
    ["2026-03-31", 3, "backward", "2026-01-31", "2026-03-31"],
    ["2026-01-31", 2, "forward", "2026-01-31", "2026-02-28"],
  ] as const)("span %s over %i months %s from %s to %s", (date, months, direction, from, until) => {
    const slices = spreadSlices(date, "100.00", months, direction);

    expect(spreadFrom(date, months, direction)).toBe(from);
    expect(spreadUntil(date, months, direction)).toBe(until);
    expect([slices[0]?.date, slices.at(-1)?.date]).toEqual([from, until]);
  });

  it("starts with the payment's month when no direction is given", () => {
    expect(spreadFrom("2026-01-15", 12)).toBe("2026-01-15");
  });
});

describe("spreadUntil", () => {
  it.each([
    ["2026-01-31", 2],
    ["2026-01-31", 13],
    ["2027-12-15", 3],
    ["2028-02-29", 12],
    ["2026-03-10", 36],
  ])("is the date of the last slice for %s over %i months", (date, months) => {
    expect(spreadUntil(date, months)).toBe(spreadSlices(date, "100.00", months).at(-1)?.date);
  });
});

describe("spreadPartWithin", () => {
  it("adds the slices that fall inside the dates", () => {
    const slices = spreadSlices("2026-01-31", "100.00", 3);

    expect(spreadPartWithin(slices, "2026-02-01", "2026-03-31")).toBe("66.66");
    expect(spreadPartWithin(slices, "2026-04-01", "2026-04-30")).toBe("0.00");
  });
});
