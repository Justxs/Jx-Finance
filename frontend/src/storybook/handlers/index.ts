import { HttpHandler } from "msw";
import type { RequestHandler } from "msw";
import {
  getAccountsMockHandler,
  getArchivedAccountsMockHandler,
  getCashFlowForecastMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import {
  getBudgetsMockHandler,
  getBudgetSuggestionsMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { getCategoriesMockHandler } from "@/api/generated/categories/categories.msw";
import {
  getCategorizationRulesMockHandler,
  getSuggestedRulesMockHandler,
} from "@/api/generated/categorization-rules/categorization-rules.msw";
import {
  getContactEntriesMockHandler,
  getContactsMockHandler,
} from "@/api/generated/contacts/contacts.msw";
import { getConversionsMockHandler } from "@/api/generated/conversions/conversions.msw";
import {
  getCategoryBreakdownMockHandler,
  getDashboardSummaryMockHandler,
  getGettingStartedMockHandler,
  getMonthlyTrendMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import { getGoalsMockHandler } from "@/api/generated/goals/goals.msw";
import {
  getHouseholdsMockHandler,
  getSettleUpMockHandler,
  getSettlementsMockHandler,
  getSharedExpensesMockHandler,
} from "@/api/generated/households/households.msw";
import {
  getImportPreviewMockHandler,
  getListCsvMappingsMockHandler,
} from "@/api/generated/imports/imports.msw";
import {
  getAssetsMockHandler,
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
  getNetWorthMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { getNotificationsMockHandler } from "@/api/generated/notifications/notifications.msw";
import { getPayeeNamesMockHandler } from "@/api/generated/payees/payees.msw";
import { getReceiptItemCategoriesMockHandler } from "@/api/generated/receipts/receipts.msw";
import {
  getBillsCalendarMockHandler,
  getRecurringBillsMockHandler,
  getRecurringTotalsMockHandler,
  getSubscriptionCandidatesMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { getReportSummaryMockHandler } from "@/api/generated/reports/reports.msw";
import { getExchangeRateEntriesMockHandler } from "@/api/generated/settings/settings.msw";
import { getSetupStatusMockHandler } from "@/api/generated/setup/setup.msw";
import { getTagsMockHandler } from "@/api/generated/tags/tags.msw";
import { getTransactionGroupsMockHandler } from "@/api/generated/transaction-groups/transaction-groups.msw";
import {
  getLedgerMockHandler,
  getPlacesMockHandler,
  getTransactionsMockHandler,
  getTransactionsSummaryMockHandler,
  getUncategorizedSuggestionsMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { getTransfersMockHandler } from "@/api/generated/transfers/transfers.msw";
import { getTrashMockHandler } from "@/api/generated/trash/trash.msw";
import { getUsersMockHandler } from "@/api/generated/users/users.msw";
import {
  currentUser,
  emptyBillsCalendar,
  emptyCashFlowForecast,
  emptyCategoryBreakdown,
  emptyDashboardSummary,
  emptyRecurringTotals,
  emptyNetWorth,
  emptyReportSummary,
  emptyTransactionsSummary,
  evenSettleUp,
  gettingStartedFresh,
  importPreview,
  noRememberedItemCategories,
  serverErrorProblem,
  setupStatus,
} from "@/storybook/fixtures";
import { accountHandlers } from "./accounts";
import { attachmentHandlers } from "./attachments";
import { authHandlers } from "./auth";
import { backupHandlers } from "./backups";
import { budgetHandlers } from "./budgets";
import { categoryHandlers } from "./categories";
import { categorizationRuleHandlers } from "./categorization-rules";
import { contactHandlers } from "./contacts";
import { conversionHandlers } from "./conversions";
import { currencyHandlers } from "./currencies";
import { dashboardHandlers } from "./dashboard";
import { goalHandlers } from "./goals";
import { householdHandlers } from "./households";
import { onRouteOf, pending, problem, query } from "./http";
import { importHandlers } from "./imports";
import { emptyInvestmentHandlers, investmentHandlers } from "./investments";
import { emptyPage } from "./lists";
import { monthCloseHandlers } from "./month-close";
import { assetHandlers, debtHandlers, netWorthHandlers } from "./net-worth";
import { notificationHandlers } from "./notifications";
import { payeeHandlers } from "./payees";
import { receiptHandlers } from "./receipts";
import { recurringBillHandlers } from "./recurring-bills";
import { reportHandlers } from "./reports";
import { settingsHandlers } from "./settings";
import { setupHandlers } from "./setup";
import { tagHandlers } from "./tags";
import { transactionGroupHandlers } from "./transaction-groups";
import { transactionHandlers } from "./transactions";
import { transferHandlers } from "./transfers";
import { trashHandlers } from "./trash";
import { userHandlers } from "./users";

export { failWith, failWithStatus, onRouteOf, pending, problem } from "./http";
export { mapTilesPresentHandler } from "./reports";
export {
  discordOffHandler,
  emailEnabledHandler,
  passkeysOffHandler,
  telegramEnabledHandler,
} from "./settings";

export const handlers: RequestHandler[] = [
  ...accountHandlers,
  ...assetHandlers,
  ...attachmentHandlers,
  ...authHandlers,
  ...backupHandlers,
  ...budgetHandlers,
  ...categorizationRuleHandlers,
  ...categoryHandlers,
  ...contactHandlers,
  ...conversionHandlers,
  ...currencyHandlers,
  ...dashboardHandlers,
  ...debtHandlers,
  ...goalHandlers,
  ...householdHandlers,
  ...importHandlers,
  ...investmentHandlers,
  ...monthCloseHandlers,
  ...netWorthHandlers,
  ...notificationHandlers,
  ...payeeHandlers,
  ...receiptHandlers,
  ...recurringBillHandlers,
  ...reportHandlers,
  ...settingsHandlers,
  ...setupHandlers,
  ...tagHandlers,
  ...transactionGroupHandlers,
  ...transactionHandlers,
  ...transferHandlers,
  ...trashHandlers,
  ...userHandlers,
];

export function withHandlers(...extra: RequestHandler[]) {
  return { msw: { handlers: [...extra, ...handlers] } };
}

const SESSION_GET_PATHS = new Set([
  getMeMockHandler(currentUser).info.path,
  getSetupStatusMockHandler(setupStatus).info.path,
]);

function dataGetHandlers(): HttpHandler[] {
  const seen = new Set<HttpHandler["info"]["path"]>();
  return handlers.flatMap((handler) => {
    if (!(handler instanceof HttpHandler) || handler.info.method !== "GET") {
      return [];
    }
    const { path } = handler.info;
    if (SESSION_GET_PATHS.has(path) || seen.has(path)) {
      return [];
    }
    seen.add(path);
    return [handler];
  });
}

export const emptyHandlers: RequestHandler[] = [
  getAccountsMockHandler([]),
  getArchivedAccountsMockHandler([]),
  getCashFlowForecastMockHandler(emptyCashFlowForecast),
  getAssetsMockHandler([]),
  getBudgetsMockHandler([]),
  getBudgetSuggestionsMockHandler({ period: "monthly", categories: [] }),
  getCategoriesMockHandler([]),
  getCategorizationRulesMockHandler([]),
  getSuggestedRulesMockHandler([]),
  getDebtsMockHandler([]),
  getGoalsMockHandler([]),
  getHouseholdsMockHandler([]),
  getSettleUpMockHandler(evenSettleUp),
  getSharedExpensesMockHandler(emptyPage),
  getSettlementsMockHandler(emptyPage),
  getContactsMockHandler([]),
  getContactEntriesMockHandler(emptyPage),
  getNotificationsMockHandler([]),
  getRecurringBillsMockHandler([]),
  getBillsCalendarMockHandler(emptyBillsCalendar),
  getRecurringTotalsMockHandler(emptyRecurringTotals),
  getSubscriptionCandidatesMockHandler([]),
  getTagsMockHandler([]),
  getPayeeNamesMockHandler([]),
  getPlacesMockHandler([]),
  getReceiptItemCategoriesMockHandler(noRememberedItemCategories),
  getUsersMockHandler([currentUser]),
  getTransactionsSummaryMockHandler(emptyTransactionsSummary),
  getTransactionsMockHandler(emptyPage),
  getLedgerMockHandler(emptyPage),
  getUncategorizedSuggestionsMockHandler([]),
  getTransactionGroupsMockHandler([]),
  getTransfersMockHandler(emptyPage),
  getConversionsMockHandler(emptyPage),
  getExchangeRateEntriesMockHandler([]),
  getDashboardSummaryMockHandler(emptyDashboardSummary),
  getGettingStartedMockHandler(gettingStartedFresh),
  getMonthlyTrendMockHandler({ items: [] }),
  getCategoryBreakdownMockHandler(emptyCategoryBreakdown),
  ...emptyInvestmentHandlers,
  getNetWorthMockHandler(emptyNetWorth),
  getNetWorthHistoryMockHandler({ items: [] }),
  getReportSummaryMockHandler(({ request }) => {
    const params = query(request);
    return {
      ...emptyReportSummary,
      periodStart: params.get("dateFrom") ?? emptyReportSummary.periodStart,
      periodEnd: params.get("dateTo") ?? emptyReportSummary.periodEnd,
    };
  }),
  getImportPreviewMockHandler({ ...importPreview, rows: [] }),
  getListCsvMappingsMockHandler([]),
  getTrashMockHandler(emptyPage),
  ...handlers,
];

export const errorHandlers: RequestHandler[] = [
  ...dataGetHandlers().map((handler) =>
    onRouteOf(handler, ({ request }) =>
      problem({ ...serverErrorProblem, instance: new URL(request.url).pathname }),
    ),
  ),
  ...handlers,
];

export const loadingHandlers: RequestHandler[] = [
  ...dataGetHandlers().map((handler) => onRouteOf(handler, pending)),
  ...handlers,
];

export const investmentsEmptyHandlers: RequestHandler[] = [...emptyInvestmentHandlers, ...handlers];
