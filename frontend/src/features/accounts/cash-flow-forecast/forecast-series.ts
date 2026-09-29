import type {
  AccountForecastResponse,
  CashFlowForecastResponse,
  Currency,
  ForecastEntryResponse,
} from "@/api/generated/model";
import { parseIso, toIso } from "@/lib/calendar";
import { toCents } from "@/lib/money";

const DAY_MS = 24 * 60 * 60 * 1000;

export const FORECAST_DAYS = 90;

export function forecastSeries(account: AccountForecastResponse, from: string, to: string) {
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end) {
    return [];
  }

  const usual = account.usualDailySpending === null ? null : toCents(account.usualDailySpending);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  let balance = toCents(account.startBalance);
  let next = 0;

  return Array.from({ length: days + 1 }, (_, day) => {
    const date = toIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + day));
    for (
      let entry = account.entries[next];
      entry && entry.date <= date;
      entry = account.entries[next]
    ) {
      balance = toCents(entry.balanceAfter);
      next += 1;
    }
    return {
      date,
      scheduled: balance / 100,
      ...(usual === null ? {} : { withSpending: (balance - usual * day) / 100 }),
    };
  });
}

export type ForecastRisk =
  | { kind: "scheduled"; date: string; entry: ForecastEntryResponse | undefined }
  | { kind: "withSpending"; date: string };

export function forecastRisks(account: AccountForecastResponse): ForecastRisk[] {
  const { belowZeroOn, belowZeroWithSpendingOn } = account;
  const scheduled: ForecastRisk[] = belowZeroOn
    ? [
        {
          kind: "scheduled",
          date: belowZeroOn,
          entry: account.entries.find(
            (entry) => entry.date === belowZeroOn && toCents(entry.balanceAfter) < 0,
          ),
        },
      ]
    : [];
  const guessed =
    belowZeroWithSpendingOn && (!belowZeroOn || belowZeroWithSpendingOn < belowZeroOn);
  return guessed
    ? [...scheduled, { kind: "withSpending", date: belowZeroWithSpendingOn }]
    : scheduled;
}

export interface ScheduledTotal {
  currency: Currency;
  out: number;
  in: number;
}

export function scheduledTotals(forecast: CashFlowForecastResponse): ScheduledTotal[] {
  const totals = new Map<Currency, ScheduledTotal>();
  for (const account of forecast.accounts) {
    const total = totals.get(account.currency) ?? { currency: account.currency, out: 0, in: 0 };
    for (const entry of account.entries) {
      const cents = toCents(entry.amount);
      if (entry.shape === "expense") {
        total.out -= cents;
      } else if (entry.shape === "income") {
        total.in += cents;
      }
    }
    totals.set(account.currency, total);
  }
  return [...totals.values()].map((total) => ({
    ...total,
    out: total.out / 100,
    in: total.in / 100,
  }));
}
