import type {
  MonthlyTrendParams,
  ReportSummaryParams,
  TransactionsParams,
} from "@/api/generated/model";
import { monthBounds } from "@/lib/calendar";

export const monthlyTrendParams: MonthlyTrendParams = { months: 6 };

export const recentTransactionsParams: TransactionsParams = { page: 1, pageSize: 6 };

interface SpendingPaceRanges {
  current: ReportSummaryParams;
  previous: ReportSummaryParams;
}

export function spendingPaceRanges(today: Date): SpendingPaceRanges {
  return {
    current: monthBounds(today),
    previous: monthBounds(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
  };
}
