import { type QueryClient, noop } from "@tanstack/react-query";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getMonthCloseYearSuspenseQueryOptions,
  getMonthReviewSuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import type {
  FeatureFlags,
  MonthCloseMonthStatus,
  TransactionsParams,
} from "@/api/generated/model";
import { latestEndedMonth, monthBounds, monthDate, monthKeyOfIso, yearOf } from "@/lib/calendar";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";

const UNCATEGORIZED_SHOWN = 20;

export function uncategorizedParams(month: string): TransactionsParams {
  return {
    page: 1,
    pageSize: UNCATEGORIZED_SHOWN,
    sort: "date",
    direction: "asc",
    ...monthBounds(monthDate(month)),
    uncategorized: true,
  };
}

export function latestYearParams(latest: string) {
  return { year: yearOf(latest) };
}

export function defaultMonth(months: readonly MonthCloseMonthStatus[], latest: string) {
  const waiting = months
    .filter((entry) => entry.status === "open" || entry.status === "closedChanged")
    .map((entry) => monthKeyOfIso(entry.month))
    .filter((key) => key <= latest)
    .toSorted();
  return waiting.at(-1) ?? latest;
}

function warmMonth(queryClient: QueryClient, month: string, features: FeatureFlags) {
  warm(queryClient, getMonthReviewSuspenseQueryOptions(month));
  warm(queryClient, getAccountsSuspenseQueryOptions());
  warm(queryClient, getCategoriesSuspenseQueryOptions());
  warm(queryClient, getTransactionsSuspenseQueryOptions(uncategorizedParams(month)));
  if (features.recurringBills) {
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
  }
}

export function warmMonthPage(queryClient: QueryClient, month: string | undefined) {
  warmWithSettings(queryClient, (settings) => {
    if (month) {
      warmMonth(queryClient, month, settings.features);
      return;
    }
    const latest = latestEndedMonth(todayDateIn(settings));
    void queryClient
      .query({
        ...getMonthCloseYearSuspenseQueryOptions(latestYearParams(latest)),
        staleTime: Infinity,
      })
      .then(
        (year) => warmMonth(queryClient, defaultMonth(year.months, latest), settings.features),
        noop,
      );
  });
}
