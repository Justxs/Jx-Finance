import type { CategoryBreakdownItem, ReportTrendPoint } from "@/api/generated/model";
import { toCents } from "@/lib/money";

export interface MonthRow {
  month: string;
  income: number;
  expense: number;
  net: number;
  savedShare: number | null;
}

export function monthRows(trend: readonly ReportTrendPoint[]): MonthRow[] {
  return trend.map((point) => {
    const income = toCents(point.income);
    const expense = toCents(point.expense);
    return {
      month: point.bucketStart,
      income: income / 100,
      expense: expense / 100,
      net: (income - expense) / 100,
      savedShare: income > 0 ? (income - expense) / income : null,
    };
  });
}

export function biggestChanges(items: readonly CategoryBreakdownItem[], count = 5) {
  return items
    .filter((item) => item.comparisonAmount != null && !item.syntheticGroup)
    .map((item) => ({ item, change: toCents(item.amount) - toCents(item.comparisonAmount ?? "0") }))
    .filter((entry) => entry.change !== 0)
    .toSorted((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, count)
    .map((entry) => entry.item);
}
