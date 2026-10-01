import type {
  MonthlyTrendParams,
  ReportSummaryParams,
  SpendingShare,
  TransactionsParams,
} from "@/api/generated/model";
import { currentMonthKey, monthBounds, monthDate } from "@/lib/calendar";
import { withShare } from "@/stores/my-share-store";

const PACE_BASELINE_MONTHS = 3;

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
  earlier: ReportSummaryParams[];
}

export function spendingPaceRanges(month: string, share?: SpendingShare): SpendingPaceRanges {
  const date = monthDate(month);
  return {
    current: withShare(monthBounds(date), share),
    earlier: Array.from({ length: PACE_BASELINE_MONTHS }, (_, index) =>
      withShare(
        monthBounds(
          new Date(date.getFullYear(), date.getMonth() - PACE_BASELINE_MONTHS + index, 1),
        ),
        share,
      ),
    ),
  };
}
