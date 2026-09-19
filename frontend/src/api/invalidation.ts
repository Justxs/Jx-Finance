import type { MutationKey, QueryClient } from "@tanstack/react-query";
import * as api from "@/api/generated";

type MutationKeyGetter = () => readonly [string];
type QueryRootGetter = () => readonly [string, ...unknown[]];

interface Rule {
  after: readonly MutationKeyGetter[];
  refresh: readonly QueryRootGetter[] | "everything";
}

const ledger = [
  api.getGetTransactionsQueryKey,
  api.getGetAccountsQueryKey,
  api.getGetDashboardSummaryQueryKey,
  api.getGetCategoryBreakdownQueryKey,
  api.getGetMonthlyTrendQueryKey,
  api.getGetReportSummaryQueryKey,
  api.getGetBudgetsQueryKey,
  api.getGetNetWorthQueryKey,
] as const;

const holdings = [
  api.getGetPortfolioQueryKey,
  api.getGetInvestmentTransactionsQueryKey,
  api.getGetSecuritiesQueryKey,
  api.getGetAccountsQueryKey,
  api.getGetDashboardSummaryQueryKey,
  api.getGetNetWorthQueryKey,
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
    refresh: [...ledger, api.getGetTransfersQueryKey],
  },
  {
    after: [api.getConfirmRecurringBillMutationKey],
    refresh: [...ledger, api.getGetRecurringBillsQueryKey, api.getGetNotificationsQueryKey],
  },
  {
    after: [
      api.getCreateAccountMutationKey,
      api.getUpdateAccountMutationKey,
      api.getDeleteAccountMutationKey,
    ],
    refresh: [
      api.getGetAccountsQueryKey,
      api.getGetTransactionsQueryKey,
      api.getGetDashboardSummaryQueryKey,
      api.getGetNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateTransferMutationKey, api.getDeleteTransferMutationKey],
    refresh: [
      api.getGetTransfersQueryKey,
      api.getGetAccountsQueryKey,
      api.getGetDashboardSummaryQueryKey,
      api.getGetNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateConversionMutationKey, api.getDeleteConversionMutationKey],
    refresh: [
      api.getGetConversionsQueryKey,
      api.getGetAccountsQueryKey,
      api.getGetTransactionsQueryKey,
      api.getGetDashboardSummaryQueryKey,
      api.getGetNetWorthQueryKey,
    ],
  },
  {
    after: [
      api.getCreateBudgetMutationKey,
      api.getUpdateBudgetMutationKey,
      api.getDeleteBudgetMutationKey,
    ],
    refresh: [api.getGetBudgetsQueryKey],
  },
  {
    after: [
      api.getCreateCategoryMutationKey,
      api.getUpdateCategoryMutationKey,
      api.getDeleteCategoryMutationKey,
    ],
    refresh: [
      api.getGetCategoriesQueryKey,
      api.getGetTransactionsQueryKey,
      api.getGetBudgetsQueryKey,
      api.getGetCategoryBreakdownQueryKey,
      api.getGetReportSummaryQueryKey,
      api.getGetRecurringBillsQueryKey,
    ],
  },
  {
    after: [
      api.getCreateGoalMutationKey,
      api.getUpdateGoalMutationKey,
      api.getDeleteGoalMutationKey,
    ],
    refresh: [api.getGetGoalsQueryKey],
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
    refresh: [api.getGetHouseholdsQueryKey],
  },
  {
    after: [
      api.getCreateAssetMutationKey,
      api.getUpdateAssetMutationKey,
      api.getDeleteAssetMutationKey,
    ],
    refresh: [api.getGetAssetsQueryKey, api.getGetNetWorthQueryKey],
  },
  {
    after: [
      api.getCreateDebtMutationKey,
      api.getUpdateDebtMutationKey,
      api.getDeleteDebtMutationKey,
    ],
    refresh: [api.getGetDebtsQueryKey, api.getGetNetWorthQueryKey],
  },
  {
    after: [
      api.getCreateRecurringBillMutationKey,
      api.getUpdateRecurringBillMutationKey,
      api.getDeleteRecurringBillMutationKey,
    ],
    refresh: [api.getGetRecurringBillsQueryKey],
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
      api.getGetBrokerConnectionsQueryKey,
      api.getGetTransfersQueryKey,
      api.getGetConversionsQueryKey,
      api.getGetTransactionsQueryKey,
    ],
  },
  {
    after: [api.getSaveBrokerConnectionMutationKey, api.getDeleteBrokerConnectionMutationKey],
    refresh: [api.getGetBrokerConnectionsQueryKey],
  },
  {
    after: [api.getMarkNotificationReadMutationKey, api.getMarkAllNotificationsReadMutationKey],
    refresh: [api.getGetNotificationsQueryKey],
  },
  {
    after: [api.getUpdateSettingsMutationKey],
    refresh: "everything",
  },
  {
    after: [api.getSyncExchangeRatesMutationKey],
    refresh: [api.getGetSettingsQueryKey, api.getGetExchangeRateQueryKey],
  },
  {
    after: [
      api.getCreateUserMutationKey,
      api.getDeactivateUserMutationKey,
      api.getUpdateUserRoleMutationKey,
    ],
    refresh: [api.getGetUsersQueryKey],
  },
  {
    after: [api.getUpdateMyProfileMutationKey],
    refresh: [api.getMeQueryKey, api.getGetUsersQueryKey],
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
