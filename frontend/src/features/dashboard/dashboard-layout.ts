import type { QueryClient } from "@tanstack/react-query";
import { noop } from "@tanstack/react-query";
import {
  getAccountsSuspenseQueryOptions,
  getBudgetsSuspenseQueryOptions,
  getCashFlowForecastSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategoryBreakdownSuspenseQueryOptions,
  getDashboardLayoutSuspenseQueryOptions,
  getDashboardSummarySuspenseQueryOptions,
  getGettingStartedSuspenseQueryOptions,
  getGoalsSuspenseQueryOptions,
  getMonthlyTrendSuspenseQueryOptions,
  getMonthReviewSuspenseQueryOptions,
  getNetWorthHistorySuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getReportSummarySuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import type {
  DashboardCard,
  DashboardLayoutResponse,
  FeatureFlags,
  SettingsResponse,
  SpendingShare,
} from "@/api/generated/model";
import { FORECAST_DAYS } from "@/components/cash-flow-forecast/forecast-series";
import { latestEndedMonth, currentMonthKey } from "@/lib/calendar";
import { type MoveDirection, adjacentIndex, swapItems } from "@/lib/reorder";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";
import type { FeatureKey } from "@/lib/settings";
import { readShare, withShare } from "@/stores/my-share-store";
import {
  asOfParams,
  pastMonthEnd,
  monthlyTrendParams,
  recentTransactionsParams,
  spendingPaceRanges,
} from "./dashboard-queries";

export interface LayoutDraft {
  order: DashboardCard[];
  hidden: DashboardCard[];
}

const cardFeature: Partial<Record<DashboardCard, FeatureKey>> = {
  spendingPace: "reports",
  budgets: "budgets",
  netWorth: "netWorth",
  upcomingBills: "recurringBills",
  cashFlow: "cashFlowForecast",
  goals: "goals",
};

function isCardAvailable(card: DashboardCard, features: FeatureFlags): boolean {
  const feature = cardFeature[card];
  return feature === undefined || features[feature];
}

export function availableCards(
  layout: LayoutDraft | DashboardLayoutResponse,
  features: FeatureFlags,
): DashboardCard[] {
  return layout.order.filter((card) => isCardAvailable(card, features));
}

export function shownCards(
  layout: LayoutDraft | DashboardLayoutResponse,
  features: FeatureFlags,
): DashboardCard[] {
  return availableCards(layout, features).filter((card) => !layout.hidden.includes(card));
}

export function moveCard(
  draft: LayoutDraft,
  card: DashboardCard,
  direction: MoveDirection,
  features: FeatureFlags,
): LayoutDraft {
  const available = availableCards(draft, features);
  const position = available.indexOf(card);
  const neighbour = available[adjacentIndex(position, direction)];
  if (position < 0 || neighbour === undefined) {
    return draft;
  }
  const order = swapItems(draft.order, draft.order.indexOf(card), draft.order.indexOf(neighbour));
  return { ...draft, order: order ?? draft.order };
}

export function setCardShown(draft: LayoutDraft, card: DashboardCard, shown: boolean): LayoutDraft {
  const hidden = draft.hidden.filter((entry) => entry !== card);
  return { ...draft, hidden: shown ? hidden : [...hidden, card] };
}

function warmCard(
  queryClient: QueryClient,
  card: DashboardCard,
  month: string,
  today: Date,
  share: SpendingShare | undefined,
) {
  switch (card) {
    case "gettingStarted":
      warm(queryClient, getGettingStartedSuspenseQueryOptions());
      break;
    case "summary":
      warm(queryClient, getDashboardSummarySuspenseQueryOptions(withShare({ month }, share)));
      break;
    case "monthlyTrend":
      warm(
        queryClient,
        getMonthlyTrendSuspenseQueryOptions(withShare(monthlyTrendParams(month), share)),
      );
      break;
    case "spendingByCategory":
      warm(queryClient, getCategoryBreakdownSuspenseQueryOptions(withShare({ month }, share)));
      break;
    case "spendingPace": {
      const ranges = spendingPaceRanges(month, share);
      warm(queryClient, getReportSummarySuspenseQueryOptions(ranges.current));
      for (const range of ranges.earlier) {
        warm(queryClient, getReportSummarySuspenseQueryOptions(range));
      }
      break;
    }
    case "budgets":
      warm(
        queryClient,
        getBudgetsSuspenseQueryOptions(withShare(asOfParams(pastMonthEnd(month, today)), share)),
      );
      break;
    case "netWorth":
      warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
      break;
    case "accounts":
      warm(queryClient, getAccountsSuspenseQueryOptions(asOfParams(pastMonthEnd(month, today))));
      break;
    case "recentTransactions":
      warm(
        queryClient,
        getTransactionsSuspenseQueryOptions(recentTransactionsParams(month, today)),
      );
      warm(queryClient, getCategoriesSuspenseQueryOptions());
      warm(queryClient, getAccountsSuspenseQueryOptions());
      break;
    case "upcomingBills":
      if (month === currentMonthKey(today)) {
        warm(queryClient, getRecurringBillsSuspenseQueryOptions());
      }
      break;
    case "cashFlow":
      if (month === currentMonthKey(today)) {
        warm(queryClient, getCashFlowForecastSuspenseQueryOptions({ days: FORECAST_DAYS }));
      }
      break;
    case "goals":
      if (month === currentMonthKey(today)) {
        warm(queryClient, getGoalsSuspenseQueryOptions());
      }
      break;
  }
}

function warmShownCards(
  queryClient: QueryClient,
  layout: DashboardLayoutResponse,
  settings: SettingsResponse,
  month: string,
) {
  for (const card of shownCards(layout, settings.features)) {
    warmCard(queryClient, card, month, todayDateIn(settings), readShare(settings.features));
  }
}

export function warmDashboard(queryClient: QueryClient, month: string | undefined) {
  const layout = queryClient.query({
    ...getDashboardLayoutSuspenseQueryOptions(),
    staleTime: Infinity,
  });
  warmWithSettings(queryClient, (settings) => {
    const today = todayDateIn(settings);
    const current = currentMonthKey(today);
    const shown = month ?? current;
    if (settings.features.monthClose) {
      const reviewed = shown === current ? latestEndedMonth(today) : shown;
      warm(queryClient, getMonthReviewSuspenseQueryOptions(reviewed));
    }
    void layout.then((loaded) => warmShownCards(queryClient, loaded, settings, shown), noop);
  });
  void layout.catch(noop);
}
