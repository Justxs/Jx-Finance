import type { MutationKey, QueryClient } from "@tanstack/react-query";
import * as api from "@/api/generated";

type MutationKeyGetter = () => readonly [string];
type QueryRootGetter = () => readonly [string, ...unknown[]];

interface Rule {
  after: readonly MutationKeyGetter[];
  refresh: readonly QueryRootGetter[] | "everything";
}

const ledger = [
  api.getTransactionsQueryKey,
  api.getAccountsQueryKey,
  api.getDashboardSummaryQueryKey,
  api.getCategoryBreakdownQueryKey,
  api.getMonthlyTrendQueryKey,
  api.getReportSummaryQueryKey,
  api.getBudgetsQueryKey,
  api.getNetWorthQueryKey,
] as const;

const holdings = [
  api.getPortfolioQueryKey,
  api.getInvestmentTransactionsQueryKey,
  api.getSecuritiesQueryKey,
  api.getAccountsQueryKey,
  api.getDashboardSummaryQueryKey,
  api.getNetWorthQueryKey,
] as const;

const rules: readonly Rule[] = [
  {
    after: [
      api.getCreateTransactionMutationKey,
      api.getUpdateTransactionMutationKey,
      api.getDeleteTransactionMutationKey,
      api.getBulkCategorizeTransactionsMutationKey,
    ],
    refresh: ledger,
  },
  {
    after: [api.getImportConfirmMutationKey],
    refresh: [...ledger, api.getTransfersQueryKey],
  },
  {
    after: [api.getConfirmRecurringBillMutationKey],
    refresh: [...ledger, api.getRecurringBillsQueryKey, api.getNotificationsQueryKey],
  },
  {
    after: [
      api.getCreateAccountMutationKey,
      api.getUpdateAccountMutationKey,
      api.getDeleteAccountMutationKey,
    ],
    refresh: [
      api.getAccountsQueryKey,
      api.getTransactionsQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateTransferMutationKey, api.getDeleteTransferMutationKey],
    refresh: [
      api.getTransfersQueryKey,
      api.getAccountsQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateConversionMutationKey, api.getDeleteConversionMutationKey],
    refresh: [
      api.getConversionsQueryKey,
      api.getAccountsQueryKey,
      api.getTransactionsQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getNetWorthQueryKey,
    ],
  },
  {
    after: [
      api.getCreateBudgetMutationKey,
      api.getUpdateBudgetMutationKey,
      api.getDeleteBudgetMutationKey,
    ],
    refresh: [api.getBudgetsQueryKey],
  },
  {
    after: [
      api.getCreateCategoryMutationKey,
      api.getUpdateCategoryMutationKey,
      api.getDeleteCategoryMutationKey,
    ],
    refresh: [
      api.getCategoriesQueryKey,
      api.getTransactionsQueryKey,
      api.getBudgetsQueryKey,
      api.getCategoryBreakdownQueryKey,
      api.getReportSummaryQueryKey,
      api.getRecurringBillsQueryKey,
    ],
  },
  {
    after: [
      api.getCreateGoalMutationKey,
      api.getUpdateGoalMutationKey,
      api.getDeleteGoalMutationKey,
    ],
    refresh: [api.getGoalsQueryKey],
  },
  {
    after: [
      api.getCreateHouseholdMutationKey,
      api.getUpdateHouseholdMutationKey,
      api.getDeleteHouseholdMutationKey,
      api.getAddMemberMutationKey,
      api.getRemoveMemberMutationKey,
      api.getUpdateMemberRoleMutationKey,
    ],
    refresh: [api.getHouseholdsQueryKey],
  },
  {
    after: [
      api.getCreateAssetMutationKey,
      api.getUpdateAssetMutationKey,
      api.getDeleteAssetMutationKey,
    ],
    refresh: [api.getAssetsQueryKey, api.getNetWorthQueryKey],
  },
  {
    after: [
      api.getCreateDebtMutationKey,
      api.getUpdateDebtMutationKey,
      api.getDeleteDebtMutationKey,
    ],
    refresh: [api.getDebtsQueryKey, api.getNetWorthQueryKey],
  },
  {
    after: [
      api.getCreateRecurringBillMutationKey,
      api.getUpdateRecurringBillMutationKey,
      api.getDeleteRecurringBillMutationKey,
    ],
    refresh: [api.getRecurringBillsQueryKey],
  },
  {
    after: [
      api.getCreateInvestmentTransactionMutationKey,
      api.getUpdateInvestmentTransactionMutationKey,
      api.getDeleteInvestmentTransactionMutationKey,
      api.getCreateSecurityMutationKey,
      api.getUpdateSecurityMutationKey,
    ],
    refresh: holdings,
  },
  {
    after: [api.getImportBrokerReportMutationKey, api.getSyncBrokerConnectionMutationKey],
    refresh: [
      ...holdings,
      api.getBrokerConnectionsQueryKey,
      api.getTransfersQueryKey,
      api.getConversionsQueryKey,
      api.getTransactionsQueryKey,
    ],
  },
  {
    after: [api.getSaveBrokerConnectionMutationKey, api.getDeleteBrokerConnectionMutationKey],
    refresh: [api.getBrokerConnectionsQueryKey],
  },
  {
    after: [api.getMarkNotificationReadMutationKey, api.getMarkAllNotificationsReadMutationKey],
    refresh: [api.getNotificationsQueryKey],
  },
  {
    after: [api.getUpdateSettingsMutationKey],
    refresh: "everything",
  },
  {
    after: [api.getSyncExchangeRatesMutationKey],
    refresh: [api.getSettingsQueryKey, api.getExchangeRateQueryKey],
  },
  {
    after: [
      api.getCreateUserMutationKey,
      api.getDeactivateUserMutationKey,
      api.getUpdateUserRoleMutationKey,
    ],
    refresh: [api.getUsersQueryKey],
  },
  {
    after: [api.getUpdateMyProfileMutationKey],
    refresh: [api.getMeQueryKey, api.getUsersQueryKey],
  },
  {
    after: [api.getEnableTwoFactorMutationKey, api.getDisableTwoFactorMutationKey],
    refresh: [api.getMeQueryKey],
  },
];

export const mutationsWithoutInvalidation: readonly MutationKeyGetter[] = [
  api.getLoginMutationKey,
  api.getLogoutMutationKey,
  api.getRefreshMutationKey,
  api.getSetupMutationKey,
  api.getSetupTwoFactorMutationKey,
  api.getImportPreviewMutationKey,
];

const refreshByMutation = new Map(
  rules.flatMap((rule) => rule.after.map((getKey) => [getKey()[0], rule.refresh] as const)),
);

export function hasInvalidationRule(mutationKey: MutationKey): boolean {
  return refreshByMutation.has(String(mutationKey[0]));
}

function isUnder(root: string, queryKey: readonly unknown[]): boolean {
  const path = queryKey[0];
  return typeof path === "string" && (path === root || path.startsWith(`${root}/`));
}

export function invalidateAfterMutation(
  client: QueryClient,
  mutationKey: MutationKey | undefined,
): Promise<void> {
  const refresh = mutationKey && refreshByMutation.get(String(mutationKey[0]));
  if (!refresh) {
    return Promise.resolve();
  }
  if (refresh === "everything") {
    return client.invalidateQueries();
  }

  const roots = refresh.map((getRoot) => getRoot()[0]);
  return client.invalidateQueries({
    predicate: (query) => roots.some((root) => isUnder(root, query.queryKey)),
  });
}
