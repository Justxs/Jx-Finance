import type { QueryClient } from "@tanstack/react-query";
import { noop } from "@tanstack/react-query";
import {
  getAccountsSuspenseQueryOptions,
  getBudgetsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategoryBreakdownSuspenseQueryOptions,
  getDashboardLayoutSuspenseQueryOptions,
  getDashboardSummarySuspenseQueryOptions,
  getMonthlyTrendSuspenseQueryOptions,
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
} from "@/api/generated/model";
import type { FeatureKey } from "@/hooks/use-settings";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";
import {
  monthlyTrendParams,
  recentTransactionsParams,
  spendingPaceRanges,
} from "./dashboard-queries";

export type MoveDirection = "up" | "down";

export interface LayoutDraft {
  order: DashboardCard[];
  hidden: DashboardCard[];
}

const cardFeature: Partial<Record<DashboardCard, FeatureKey>> = {
  spendingPace: "reports",
  budgets: "budgets",
  netWorth: "netWorth",
  upcomingBills: "recurringBills",
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
  const neighbour = available[direction === "up" ? position - 1 : position + 1];
  if (position < 0 || neighbour === undefined) {
    return draft;
  }
  const from = draft.order.indexOf(card);
  const to = draft.order.indexOf(neighbour);
  const order = [...draft.order];
  order[from] = neighbour;
  order[to] = card;
  return { ...draft, order };
}

export function setCardShown(draft: LayoutDraft, card: DashboardCard, shown: boolean): LayoutDraft {
  const hidden = draft.hidden.filter((entry) => entry !== card);
  return { ...draft, hidden: shown ? hidden : [...hidden, card] };
}

function warmCard(queryClient: QueryClient, card: DashboardCard, settings: SettingsResponse) {
  switch (card) {
    case "summary":
      warm(queryClient, getDashboardSummarySuspenseQueryOptions());
      break;
    case "monthlyTrend":
      warm(queryClient, getMonthlyTrendSuspenseQueryOptions(monthlyTrendParams));
      break;
    case "spendingByCategory":
      warm(queryClient, getCategoryBreakdownSuspenseQueryOptions());
      break;
    case "spendingPace": {
      const ranges = spendingPaceRanges(todayDateIn(settings));
      warm(queryClient, getReportSummarySuspenseQueryOptions(ranges.current));
      warm(queryClient, getReportSummarySuspenseQueryOptions(ranges.previous));
      break;
    }
    case "budgets":
      warm(queryClient, getBudgetsSuspenseQueryOptions());
      break;
    case "netWorth":
      warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
      break;
    case "accounts":
      warm(queryClient, getAccountsSuspenseQueryOptions());
      break;
    case "recentTransactions":
      warm(queryClient, getTransactionsSuspenseQueryOptions(recentTransactionsParams));
      warm(queryClient, getCategoriesSuspenseQueryOptions());
      warm(queryClient, getAccountsSuspenseQueryOptions());
      break;
    case "upcomingBills":
      warm(queryClient, getRecurringBillsSuspenseQueryOptions());
      break;
  }
}

function warmShownCards(
  queryClient: QueryClient,
  layout: DashboardLayoutResponse,
  settings: SettingsResponse,
) {
  for (const card of shownCards(layout, settings.features)) {
    warmCard(queryClient, card, settings);
  }
}

export function warmDashboard(queryClient: QueryClient) {
  const layout = queryClient.query({
    ...getDashboardLayoutSuspenseQueryOptions(),
    staleTime: Infinity,
  });
  warmWithSettings(queryClient, (settings) => {
    void layout.then((loaded) => warmShownCards(queryClient, loaded, settings), noop);
  });
  void layout.catch(noop);
}
