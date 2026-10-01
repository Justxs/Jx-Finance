import type {
  BudgetResponse,
  MonthCloseMonthStatus,
  MonthCloseStatus,
  MonthCloseYearResponse,
  MonthDrift,
  MonthReviewResponse,
} from "@/api/generated/model";
import { monthBounds, parseIso, previousMonth, toIso } from "@/lib/calendar";
import { accounts } from "./accounts";
import { ids } from "./base";
import { budgets } from "./budgets";
import { netWorthHistoryItems } from "./net-worth";
import { buildReportSummary, emptyReportSummary, withComparison } from "./reports";

export const MONTH_CLOSE_MONTH = "2026-08";
export const MONTH_CLOSE_CHANGED_MONTH = "2026-07";
export const MONTH_CLOSE_RUNNING_MONTH = "2026-09";

function boundsOf(month: string) {
  return monthBounds(parseIso(`${month}-01`) ?? new Date());
}

function lastDayOf(month: string) {
  return boundsOf(month).dateTo;
}

function statusOf(month: string): MonthCloseStatus {
  if (month >= MONTH_CLOSE_RUNNING_MONTH) {
    return "notEnded";
  }
  if (month === MONTH_CLOSE_MONTH) {
    return "open";
  }
  return month === MONTH_CLOSE_CHANGED_MONTH ? "closedChanged" : "closed";
}

export function monthCloseYearOf(year: number): MonthCloseYearResponse {
  const months: MonthCloseMonthStatus[] = Array.from({ length: 12 }, (_, offset) => {
    const month = toIso(new Date(year, offset, 1));
    const status = statusOf(month.slice(0, 7));
    return {
      month,
      status,
      closedAt:
        status === "closed" || status === "closedChanged"
          ? `${toIso(new Date(year, Math.min(offset + 1, 11), 3))}T18:20:00Z`
          : null,
    };
  });
  return { year, months };
}

export const monthCloseYear = monthCloseYearOf(2026);

function figuresOf(month: string) {
  const { dateFrom, dateTo } = boundsOf(month);
  const earlier = monthBounds(previousMonth(parseIso(dateFrom) ?? new Date()));
  return withComparison(
    buildReportSummary(dateFrom, dateTo),
    "previousMonth",
    earlier.dateFrom,
    earlier.dateTo,
  );
}

function monthlyBudgets(month: string): BudgetResponse[] {
  return budgets
    .filter((budget) => budget.period === "monthly")
    .map((budget) => ({ ...budget, windowStart: `${month}-01`, windowEnd: lastDayOf(month) }));
}

function accountName(id: string) {
  return accounts.find((account) => account.id === id)?.name ?? "";
}

export function monthReviewOf(month: string, patch: Partial<MonthReviewResponse> = {}) {
  const review: MonthReviewResponse = {
    month: `${month}-01`,
    monthEnd: lastDayOf(month),
    status: "open",
    closedAt: null,
    note: null,
    checklist: {
      uncategorized: 3,
      unconfirmedRecurring: 2,
      unusual: 1,
      duplicates: 0,
      accounts: [
        {
          accountId: ids.accounts.checking,
          accountName: accountName(ids.accounts.checking),
          state: "reconciled",
          date: lastDayOf(month),
          difference: "0.00",
          currency: "eur",
        },
        {
          accountId: ids.accounts.shared,
          accountName: accountName(ids.accounts.shared),
          state: "behind",
          date: `${month}-24`,
          difference: null,
          currency: "eur",
        },
      ],
    },
    figures: figuresOf(month),
    budgets: monthlyBudgets(month),
    netWorthStart: netWorthHistoryItems.at(-2) ?? null,
    netWorthEnd: netWorthHistoryItems.at(-1) ?? null,
    drift: null,
  };
  return { ...review, ...patch };
}

const clearChecklist: MonthReviewResponse["checklist"] = {
  uncategorized: 0,
  unconfirmedRecurring: 0,
  unusual: 0,
  duplicates: 0,
  accounts: [
    {
      accountId: ids.accounts.checking,
      accountName: accountName(ids.accounts.checking),
      state: "imported",
      date: "2026-08-31",
      difference: null,
      currency: "eur",
    },
  ],
};

function settledDrift(review: MonthReviewResponse): MonthDrift {
  return {
    currencyChanged: false,
    closedCurrency: "eur",
    totals: {
      closedIncome: review.figures.totalIncome,
      closedExpense: review.figures.totalExpense,
      closedNet: review.figures.net,
      closedCount: 12,
      currentCount: 12,
    },
    categories: [],
    rows: [],
    rowCount: 0,
  };
}

export const openMonthReview = monthReviewOf(MONTH_CLOSE_MONTH);

export const clearOpenMonthReview = monthReviewOf(MONTH_CLOSE_MONTH, { checklist: clearChecklist });

const closedBase = monthReviewOf(MONTH_CLOSE_MONTH, {
  status: "closed",
  closedAt: "2026-09-02T18:24:00Z",
  note: "Matched the Swedbank statement.",
  checklist: clearChecklist,
});

export const closedMonthReview: MonthReviewResponse = {
  ...closedBase,
  drift: settledDrift(closedBase),
};

export const closedChangedMonthReview: MonthReviewResponse = {
  ...closedBase,
  status: "closedChanged",
  drift: {
    currencyChanged: false,
    closedCurrency: "eur",
    totals: {
      closedIncome: closedBase.figures.totalIncome,
      closedExpense: "1412.18",
      closedNet: "3615.60",
      closedCount: 12,
      currentCount: 13,
    },
    categories: [
      {
        type: "expense",
        categoryId: ids.categories.food,
        syntheticGroup: null,
        categoryName: "Maistas",
        closedAmount: "208.40",
        currentAmount: "236.03",
      },
      {
        type: "expense",
        categoryId: null,
        syntheticGroup: null,
        categoryName: "Uncategorized",
        closedAmount: "50.00",
        currentAmount: "0.00",
      },
    ],
    rows: [
      {
        id: "55555555-0000-4000-8000-000000000022",
        kind: "transaction",
        change: "edited",
        date: "2026-08-30",
        description: "IKI Antakalnis",
        amount: "27.63",
        currency: "eur",
        changedAt: "2026-09-12T08:40:00Z",
      },
      {
        id: "55555555-0000-4000-8000-000000000901",
        kind: "transaction",
        change: "created",
        date: "2026-08-29",
        description: "Rimi – forgotten receipt",
        amount: "18.40",
        currency: "eur",
        changedAt: "2026-09-10T19:05:00Z",
      },
      {
        id: "55555555-0000-4000-8000-000000000902",
        kind: "transaction",
        change: "movedOut",
        date: "2026-09-01",
        description: "Parking permit",
        amount: "50.00",
        currency: "eur",
        changedAt: "2026-09-08T12:00:00Z",
      },
      {
        id: "55555555-0000-4000-8000-000000000025",
        kind: "transaction",
        change: "edited",
        date: "2026-08-20",
        description: "Trafi – mėnesinis viešojo transporto bilietas",
        amount: "29.00",
        currency: "eur",
        changedAt: "2026-09-05T09:15:00Z",
      },
    ],
    rowCount: 4,
  },
};

export const currencyChangedMonthReview: MonthReviewResponse = {
  ...closedBase,
  status: "closedChanged",
  drift: {
    currencyChanged: true,
    closedCurrency: "usd",
    totals: null,
    categories: [],
    rows: [],
    rowCount: 0,
  },
};

export const notEndedMonthReview = monthReviewOf(MONTH_CLOSE_RUNNING_MONTH, {
  status: "notEnded",
  netWorthStart: netWorthHistoryItems.at(-1) ?? null,
  netWorthEnd: null,
});

export const emptyMonthReview = monthReviewOf(MONTH_CLOSE_MONTH, {
  checklist: { uncategorized: 0, unconfirmedRecurring: 0, unusual: 0, duplicates: 0, accounts: [] },
  figures: { ...emptyReportSummary, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
  budgets: [],
  netWorthStart: null,
  netWorthEnd: null,
});
