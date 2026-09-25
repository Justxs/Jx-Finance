import type { MutationKey, QueryClient } from "@tanstack/react-query";
import * as api from "@/api/generated";

type MutationKeyGetter = () => readonly [string];
type QueryRootGetter = () => readonly [string, ...unknown[]];

interface Rule {
  after: readonly MutationKeyGetter[];
  deleted?: readonly MutationKeyGetter[];
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
  api.getTaxSummaryQueryKey,
  api.getValueHistoryQueryKey,
  api.getInvestmentTransactionsQueryKey,
  api.getSecuritiesQueryKey,
  api.getAccountsQueryKey,
  api.getDashboardSummaryQueryKey,
  api.getNetWorthQueryKey,
] as const;

const rules: readonly Rule[] = [
  {
    after: [
      api.getCreateBackupMutationKey,
      api.getUploadBackupMutationKey,
      api.getUpdateBackupMutationKey,
      api.getDeleteBackupMutationKey,
    ],
    refresh: [api.getBackupsQueryKey],
  },
  {
    after: [
      api.getCreateTransactionMutationKey,
      api.getUpdateTransactionMutationKey,
      api.getBulkCategorizeTransactionsMutationKey,
      api.getBulkTagTransactionsMutationKey,
    ],
    deleted: [api.getDeleteTransactionMutationKey],
    refresh: ledger,
  },
  {
    after: [api.getUploadAttachmentMutationKey],
    deleted: [api.getDeleteAttachmentMutationKey],
    refresh: [api.getTransactionsQueryKey],
  },
  {
    after: [api.getRestoreDeletedMutationKey, api.getRestoreAccountMutationKey],
    refresh: "everything",
  },
  {
    after: [api.getCreateTagMutationKey, api.getUpdateTagMutationKey],
    deleted: [api.getDeleteTagMutationKey],
    refresh: [
      api.getTagsQueryKey,
      api.getTransactionsQueryKey,
      api.getTransactionsSummaryQueryKey,
      api.getReportSummaryQueryKey,
    ],
  },
  {
    after: [
      api.getCreateCategorizationRuleMutationKey,
      api.getUpdateCategorizationRuleMutationKey,
      api.getMoveCategorizationRuleMutationKey,
    ],
    deleted: [api.getDeleteCategorizationRuleMutationKey],
    refresh: [api.getCategorizationRulesQueryKey],
  },
  {
    after: [api.getRunCategorizationRulesMutationKey],
    refresh: [...ledger, api.getCategorizationRulesQueryKey],
  },
  {
    after: [api.getImportConfirmMutationKey],
    refresh: [...ledger, api.getTransfersQueryKey],
  },
  {
    after: [api.getConfirmRecurringBillMutationKey],
    refresh: [
      ...ledger,
      api.getRecurringBillsQueryKey,
      api.getNotificationsQueryKey,
      api.getTransfersQueryKey,
    ],
  },
  {
    after: [
      api.getCreateAccountMutationKey,
      api.getUpdateAccountMutationKey,
      api.getDeleteAccountMutationKey,
    ],
    refresh: [
      api.getAccountsQueryKey,
      api.getArchivedAccountsQueryKey,
      api.getTransactionsQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateTransferMutationKey, api.getUpdateTransferMutationKey],
    deleted: [api.getDeleteTransferMutationKey],
    refresh: [
      api.getTransfersQueryKey,
      api.getAccountsQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getNetWorthQueryKey,
    ],
  },
  {
    after: [api.getCreateConversionMutationKey, api.getUpdateConversionMutationKey],
    deleted: [api.getDeleteConversionMutationKey],
    refresh: [...ledger, api.getConversionsQueryKey],
  },
  {
    after: [api.getCreateBudgetMutationKey, api.getUpdateBudgetMutationKey],
    deleted: [api.getDeleteBudgetMutationKey],
    refresh: [api.getBudgetsQueryKey],
  },
  {
    after: [api.getCreateCategoryMutationKey, api.getUpdateCategoryMutationKey],
    deleted: [api.getDeleteCategoryMutationKey],
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
    after: [api.getCreateGoalMutationKey, api.getUpdateGoalMutationKey],
    deleted: [api.getDeleteGoalMutationKey],
    refresh: [api.getGoalsQueryKey],
  },
  {
    after: [
      api.getCreateHouseholdMutationKey,
      api.getUpdateHouseholdMutationKey,
      api.getAddMemberMutationKey,
      api.getUpdateMemberRoleMutationKey,
    ],
    refresh: [api.getHouseholdsQueryKey],
  },
  {
    after: [api.getRemoveMemberMutationKey],
    deleted: [api.getDeleteHouseholdMutationKey],
    refresh: [
      ...ledger,
      api.getHouseholdsQueryKey,
      api.getCategoriesQueryKey,
      api.getTagsQueryKey,
      api.getTransfersQueryKey,
      api.getConversionsQueryKey,
      api.getRecurringBillsQueryKey,
    ],
  },
  {
    after: [api.getCreateAssetMutationKey, api.getUpdateAssetMutationKey],
    deleted: [api.getDeleteAssetMutationKey],
    refresh: [api.getAssetsQueryKey, api.getNetWorthQueryKey],
  },
  {
    after: [api.getCreateDebtMutationKey, api.getUpdateDebtMutationKey],
    deleted: [api.getDeleteDebtMutationKey],
    refresh: [api.getDebtsQueryKey, api.getNetWorthQueryKey],
  },
  {
    after: [api.getCreateRecurringBillMutationKey, api.getUpdateRecurringBillMutationKey],
    deleted: [api.getDeleteRecurringBillMutationKey],
    refresh: [api.getRecurringBillsQueryKey, api.getSubscriptionCandidatesQueryKey],
  },
  {
    after: [api.getDismissSubscriptionCandidateMutationKey],
    refresh: [api.getSubscriptionCandidatesQueryKey],
  },
  {
    after: [
      api.getCreateInvestmentTransactionMutationKey,
      api.getUpdateInvestmentTransactionMutationKey,
      api.getCreateSecurityMutationKey,
      api.getUpdateSecurityMutationKey,
      api.getSetSecurityPriceMutationKey,
      api.getDeleteSecurityPriceMutationKey,
    ],
    deleted: [api.getDeleteInvestmentTransactionMutationKey],
    refresh: holdings,
  },
  {
    after: [api.getImportBrokerReportMutationKey, api.getSyncBrokerConnectionMutationKey],
    refresh: [
      ...ledger,
      ...holdings,
      api.getBrokerConnectionsQueryKey,
      api.getTransfersQueryKey,
      api.getConversionsQueryKey,
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
    refresh: [
      api.getSettingsQueryKey,
      api.getExchangeRateQueryKey,
      api.getAccountsQueryKey,
      api.getNetWorthQueryKey,
      api.getDashboardSummaryQueryKey,
      api.getPortfolioQueryKey,
      api.getValueHistoryQueryKey,
    ],
  },
  {
    after: [
      api.getCreateUserMutationKey,
      api.getDeactivateUserMutationKey,
      api.getReactivateUserMutationKey,
      api.getResetUserPasswordMutationKey,
      api.getUpdateUserRoleMutationKey,
    ],
    refresh: [api.getUsersQueryKey],
  },
  {
    after: [api.getUpdateMyProfileMutationKey],
    refresh: [api.getMeQueryKey, api.getUsersQueryKey, api.getSessionsQueryKey],
  },
  {
    after: [api.getUpdateSmtpSettingsMutationKey],
    refresh: [api.getSmtpSettingsQueryKey, api.getPublicSettingsQueryKey],
  },
  {
    after: [api.getVerifyEmailMutationKey],
    refresh: [api.getMeQueryKey, api.getUsersQueryKey],
  },
  {
    after: [api.getEnableTwoFactorMutationKey, api.getDisableTwoFactorMutationKey],
    refresh: [api.getMeQueryKey, api.getSessionsQueryKey],
  },
  {
    after: [api.getRevokeSessionMutationKey, api.getRevokeOtherSessionsMutationKey],
    refresh: [api.getSessionsQueryKey],
  },
];

export const mutationsWithoutInvalidation: readonly MutationKeyGetter[] = [
  api.getLoginMutationKey,
  api.getLogoutMutationKey,
  api.getRefreshMutationKey,
  api.getSetupMutationKey,
  api.getSetupTwoFactorMutationKey,
  api.getImportPreviewMutationKey,
  api.getPreviewCategorizationRunMutationKey,
  api.getTestCategorizationRuleMutationKey,
  api.getRestoreBackupMutationKey,
  api.getForgotPasswordMutationKey,
  api.getResetPasswordMutationKey,
  api.getSendVerificationEmailMutationKey,
  api.getSendTestEmailMutationKey,
  api.getSaveDashboardLayoutMutationKey,
  api.getResetDashboardLayoutMutationKey,
];

function withTrash(refresh: Rule["refresh"]): Rule["refresh"] {
  return refresh === "everything" ? refresh : [...refresh, api.getTrashQueryKey];
}

const refreshByMutation = new Map(
  rules.flatMap((rule) => [
    ...rule.after.map((getKey) => [getKey()[0], rule.refresh] as const),
    ...(rule.deleted ?? []).map((getKey) => [getKey()[0], withTrash(rule.refresh)] as const),
  ]),
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
