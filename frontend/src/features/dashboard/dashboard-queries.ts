import type {
  MonthlyTrendParams,
  ReportSummaryParams,
  TransactionsParams,
} from "@/api/generated/model";
import { monthDate, monthKeyOfIso } from "@/features/month-close/month-key";
import { monthBounds, previousMonth, toIso } from "@/lib/calendar";

export function currentMonthKey(today: Date) {
  return monthKeyOfIso(toIso(today));
}

export function monthlyTrendParams(month: string): MonthlyTrendParams {
  return { months: 6, month };
}

export function pastMonthEnd(month: string, today: Date): string | undefined {
  return month === currentMonthKey(today) ? undefined : monthBounds(monthDate(month)).dateTo;
}

export function asOfParams(until: string | undefined) {
  return until === undefined ? undefined : { asOf: until };
}

export function recentTransactionsParams(month: string, today: Date): TransactionsParams {
  const latest = { page: 1, pageSize: 6 };
  return month === currentMonthKey(today)
    ? latest
    : { ...latest, ...monthBounds(monthDate(month)) };
}

interface SpendingPaceRanges {
  current: ReportSummaryParams;
  previous: ReportSummaryParams;
}

export function spendingPaceRanges(month: string): SpendingPaceRanges {
  const date = monthDate(month);
  return {
    current: monthBounds(date),
    previous: monthBounds(previousMonth(date)),
  };
}
