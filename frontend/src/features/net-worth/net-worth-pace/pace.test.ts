import { describe, expect, test } from "vitest";
import type { NetWorthSnapshotItem } from "@/api/generated/model";
import {
  type Pace,
  milestoneReach,
  paceLine,
  suggestedMilestones,
  trailingPace,
  withMilestone,
} from "./pace";

function snapshot(date: string, netWorth: number): NetWorthSnapshotItem {
  return { date, accounts: "0.00", assets: "0.00", debts: "0.00", netWorth: netWorth.toFixed(2) };
}

function pace(overrides: Partial<Pace>): Pace {
  return {
    from: "2025-09-01",
    to: "2026-09-01",
    latest: 50_000,
    perMonth: 1000,
    days: 365,
    steps: 12,
    ...overrides,
  };
}

describe("trailingPace", () => {
  test("averages the change since the newest snapshot twelve months or more before the last", () => {
    const result = trailingPace([
      snapshot("2025-06-01", 10_000),
      snapshot("2025-09-01", 38_000),
      snapshot("2026-03-01", 40_000),
      snapshot("2026-09-01", 50_000),
    ]);

    expect(result).toMatchObject({
      from: "2025-09-01",
      to: "2026-09-01",
      latest: 50_000,
      steps: 2,
    });
    expect(result?.days).toBe(365);
    expect(result?.perMonth).toBeCloseTo((12_000 * 365.25) / 12 / 365, 6);
  });

  test("uses the oldest snapshot when the history is shorter than twelve months", () => {
    const result = trailingPace([
      snapshot("2026-03-01", 20_000),
      snapshot("2026-06-01", 18_000),
      snapshot("2026-09-01", 17_000),
    ]);

    expect(result).toMatchObject({ from: "2026-03-01", steps: 2 });
    expect(result?.perMonth).toBeLessThan(0);
  });

  test("gives no pace under ninety days of history", () => {
    expect(trailingPace([snapshot("2026-06-10", 1), snapshot("2026-09-01", 2)])).toBeNull();
    expect(trailingPace([snapshot("2026-09-01", 2)])).toBeNull();
    expect(trailingPace([])).toBeNull();
  });

  test("accepts exactly ninety days", () => {
    expect(trailingPace([snapshot("2026-06-03", 0), snapshot("2026-09-01", 900)])).not.toBeNull();
  });
});

describe("paceLine", () => {
  test("starts at the last snapshot and runs as far ahead as the window, with as many points", () => {
    const line = paceLine(pace({ days: 182, steps: 6, perMonth: 1000 }));

    expect(line).toHaveLength(7);
    expect(line[0]).toEqual({ date: "2026-09-01", value: 50_000 });
    expect(line.at(-1)?.date).toBe("2027-03-02");
    expect(line.at(-1)?.value).toBeCloseTo(50_000 + (1000 * 182 * 12) / 365.25, 6);
  });

  test("stops a longer window at a year ahead and keeps the spacing", () => {
    const line = paceLine(pace({ days: 730, steps: 730 }));

    expect(line).toHaveLength(366);
    expect(line.at(-1)?.date).toBe("2027-09-01");
  });

  test("draws a flat line at a zero pace", () => {
    expect(paceLine(pace({ perMonth: 0 })).every((point) => point.value === 50_000)).toBe(true);
  });
});

describe("milestoneReach", () => {
  test("dates a milestone above today's figure at a rising pace", () => {
    expect(milestoneReach(pace({ perMonth: 1000 }), 62_000)).toEqual({
      state: "on",
      date: "2027-09-01",
    });
  });

  test("says a milestone at or below the last snapshot is reached", () => {
    expect(milestoneReach(pace({}), 50_000)).toEqual({ state: "reached" });
    expect(milestoneReach(pace({ perMonth: -500 }), 10_000)).toEqual({ state: "reached" });
  });

  test("never reaches a higher milestone at a zero or falling pace", () => {
    expect(milestoneReach(pace({ perMonth: 0 }), 60_000)).toEqual({ state: "never" });
    expect(milestoneReach(pace({ perMonth: -10 }), 60_000)).toEqual({ state: "never" });
  });

  test("gives up beyond fifty years", () => {
    expect(milestoneReach(pace({ perMonth: 1 }), 50_601)).toEqual({ state: "beyond" });
    expect(milestoneReach(pace({ perMonth: 1 }), 50_600).state).toBe("on");
  });
});

describe("suggestedMilestones", () => {
  test.each([
    [72_345, [100_000, 200_000]],
    [100_000, [200_000, 500_000]],
    [1_250_000, [2_000_000, 5_000_000]],
    [450, [500, 1000]],
    [0, [1, 2]],
    [-20_000, [0, 50_000]],
  ])("suggests the next round numbers above %d", (latest, expected) => {
    expect(suggestedMilestones(latest)).toEqual(expected);
  });
});

describe("withMilestone", () => {
  test("keeps the list sorted and without repeats", () => {
    expect(withMilestone([200_000, 100_000], 150_000)).toEqual([100_000, 150_000, 200_000]);
    expect(withMilestone([100_000], 100_000)).toEqual([100_000]);
  });
});
