import { describe, expect, test } from "vitest";
import type { AccountForecastResponse } from "@/api/generated/model";
import { forecastRisks, forecastSeries, scheduledTotals } from "./forecast-series";

function forecast(overrides: Partial<AccountForecastResponse>): AccountForecastResponse {
  return {
    accountId: "account",
    accountName: "Everyday",
    currency: "eur",
    startBalance: "100.00",
    usualDailySpending: null,
    lowestBalance: "100.00",
    lowestOn: "2026-10-30",
    belowZeroOn: null,
    belowZeroWithSpendingOn: null,
    otherCurrencies: false,
    entries: [],
    ...overrides,
  };
}

function entry(
  date: string,
  amount: string,
  balanceAfter: string,
  shape: "expense" | "income" | "transfer" = "expense",
) {
  return {
    date,
    source: "recurring" as const,
    billId: null,
    name: "Rent",
    shape,
    amount,
    estimated: false,
    overdue: false,
    balanceAfter,
  };
}

describe("forecastSeries", () => {
  test("gives one point per day from the first day to the last, both included", () => {
    const points = forecastSeries(forecast({}), "2026-10-30", "2026-11-02");

    expect(points.map((point) => point.date)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(points.every((point) => point.scheduled === 100)).toBe(true);
  });

  test("steps to the balance after the last entry of each day", () => {
    const points = forecastSeries(
      forecast({
        entries: [
          entry("2026-10-31", "50.00", "150.00"),
          entry("2026-10-31", "-80.00", "70.00"),
          entry("2026-11-02", "-90.00", "-20.00"),
        ],
      }),
      "2026-10-30",
      "2026-11-02",
    );

    expect(points.map((point) => point.scheduled)).toEqual([100, 70, 70, -20]);
  });

  test("takes the usual daily spending off from the day after the first", () => {
    const points = forecastSeries(
      forecast({ usualDailySpending: "12.50", entries: [entry("2026-10-31", "-10.00", "90.00")] }),
      "2026-10-30",
      "2026-11-01",
    );

    expect(points.map((point) => point.withSpending)).toEqual([100, 77.5, 65]);
  });

  test("leaves the second line out without usual spending", () => {
    const [point] = forecastSeries(forecast({}), "2026-10-30", "2026-10-30");

    expect(point).toEqual({ date: "2026-10-30", scheduled: 100 });
  });
});

describe("forecastRisks", () => {
  test("names the entry that takes the balance below zero", () => {
    const rent = entry("2026-11-01", "-200.00", "-50.00");
    const risks = forecastRisks(
      forecast({
        belowZeroOn: "2026-11-01",
        belowZeroWithSpendingOn: "2026-11-01",
        entries: [entry("2026-11-01", "50.00", "150.00"), rent],
      }),
    );

    expect(risks).toEqual([{ kind: "scheduled", date: "2026-11-01", entry: rent }]);
  });

  test("adds the usual-spending date only when it comes first", () => {
    const risks = forecastRisks(
      forecast({ belowZeroOn: "2026-11-20", belowZeroWithSpendingOn: "2026-11-02" }),
    );

    expect(risks).toEqual([
      { kind: "scheduled", date: "2026-11-20", entry: undefined },
      { kind: "withSpending", date: "2026-11-02" },
    ]);
  });

  test("is empty for an account that stays above zero", () => {
    expect(forecastRisks(forecast({}))).toEqual([]);
  });
});

describe("scheduledTotals", () => {
  test("adds expenses as out and income as in per currency, leaving transfers out", () => {
    const totals = scheduledTotals({
      from: "2026-10-30",
      to: "2027-01-28",
      notCounted: [],
      accounts: [
        forecast({
          entries: [
            entry("2026-11-01", "-200.00", "-100.00"),
            entry("2026-11-02", "1000.50", "900.50", "income"),
            entry("2026-11-03", "-300.00", "600.50", "transfer"),
          ],
        }),
        forecast({ currency: "usd", entries: [entry("2026-11-04", "-20.10", "79.90")] }),
      ],
    });

    expect(totals).toEqual([
      { currency: "eur", out: 200, in: 1000.5 },
      { currency: "usd", out: 20.1, in: 0 },
    ]);
  });
});
