import { HttpHandler } from "msw";
import type { RequestHandler } from "msw";
import {
  getAccountsMockHandler,
  getArchivedAccountsMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getBudgetsMockHandler } from "@/api/generated/budgets/budgets.msw";
import { getCategoriesMockHandler } from "@/api/generated/categories/categories.msw";
import { getCategorizationRulesMockHandler } from "@/api/generated/categorization-rules/categorization-rules.msw";
import { getConversionsMockHandler } from "@/api/generated/conversions/conversions.msw";
import {
  getCategoryBreakdownMockHandler,
  getDashboardSummaryMockHandler,
  getMonthlyTrendMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import { getGoalsMockHandler } from "@/api/generated/goals/goals.msw";
import { getHouseholdsMockHandler } from "@/api/generated/households/households.msw";
import { getImportPreviewMockHandler } from "@/api/generated/imports/imports.msw";
import {
  getAssetsMockHandler,
  getDebtsMockHandler,
  getNetWorthHistoryMockHandler,
  getNetWorthMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { getNotificationsMockHandler } from "@/api/generated/notifications/notifications.msw";
import {
  getRecurringBillsMockHandler,
  getSubscriptionCandidatesMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { getReportSummaryMockHandler } from "@/api/generated/reports/reports.msw";
import { getSetupStatusMockHandler } from "@/api/generated/setup/setup.msw";
import { getTagsMockHandler } from "@/api/generated/tags/tags.msw";
import {
  getTransactionsMockHandler,
  getTransactionsSummaryMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { getTransfersMockHandler } from "@/api/generated/transfers/transfers.msw";
import { getTrashMockHandler } from "@/api/generated/trash/trash.msw";
import { getUsersMockHandler } from "@/api/generated/users/users.msw";
import {
  currentUser,
  emptyCategoryBreakdown,
  emptyDashboardSummary,
  emptyNetWorth,
  emptyReportSummary,
  emptyTransactionsSummary,
  importFormatProblem,
  importPreviewAllDuplicates,
  serverErrorProblem,
  setupStatus,
  unauthorizedProblem,
} from "@/storybook/fixtures";
import { accountHandlers } from "./accounts";
import { attachmentHandlers } from "./attachments";
import { authHandlers } from "./auth";
import { backupHandlers } from "./backups";
import { budgetHandlers } from "./budgets";
import { categoryHandlers } from "./categories";
import { categorizationRuleHandlers } from "./categorization-rules";
import { conversionHandlers } from "./conversions";
import { currencyHandlers } from "./currencies";
import { dashboardHandlers } from "./dashboard";
import { goalHandlers } from "./goals";
import { householdHandlers } from "./households";
import { failWith, onRouteOf, pending, problem } from "./http";
import { importHandlers } from "./imports";
import { emptyInvestmentHandlers, investmentHandlers } from "./investments";
import { emptyPage } from "./lists";
import { assetHandlers, debtHandlers, netWorthHandlers } from "./net-worth";
import { notificationHandlers } from "./notifications";
import { recurringBillHandlers } from "./recurring-bills";
import { reportHandlers } from "./reports";
import { settingsHandlers } from "./settings";
import { setupHandlers } from "./setup";
import { tagHandlers } from "./tags";
import { transactionHandlers } from "./transactions";
import { transferHandlers } from "./transfers";
import { trashHandlers } from "./trash";
import { userHandlers } from "./users";

export { failWith, failWithStatus, onRouteOf, pending, problem } from "./http";
export { emailEnabledHandler } from "./settings";

export const handlers: RequestHandler[] = [
  ...accountHandlers,
  ...assetHandlers,
  ...attachmentHandlers,
  ...authHandlers,
  ...backupHandlers,
  ...budgetHandlers,
  ...categorizationRuleHandlers,
  ...categoryHandlers,
  ...conversionHandlers,
  ...currencyHandlers,
  ...dashboardHandlers,
  ...debtHandlers,
  ...goalHandlers,
  ...householdHandlers,
  ...importHandlers,
  ...investmentHandlers,
  ...netWorthHandlers,
  ...notificationHandlers,
  ...recurringBillHandlers,
  ...reportHandlers,
  ...settingsHandlers,
  ...setupHandlers,
  ...tagHandlers,
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
  getAssetsMockHandler([]),
  getBudgetsMockHandler([]),
  getCategoriesMockHandler([]),
  getCategorizationRulesMockHandler([]),
  getDebtsMockHandler([]),
  getGoalsMockHandler([]),
  getHouseholdsMockHandler([]),
  getNotificationsMockHandler([]),
  getRecurringBillsMockHandler([]),
  getSubscriptionCandidatesMockHandler([]),
  getTagsMockHandler([]),
  getUsersMockHandler([currentUser]),
  getTransactionsSummaryMockHandler(emptyTransactionsSummary),
  getTransactionsMockHandler(emptyPage),
  getTransfersMockHandler(emptyPage),
  getConversionsMockHandler(emptyPage),
  getDashboardSummaryMockHandler(emptyDashboardSummary),
  getMonthlyTrendMockHandler({ items: [] }),
  getCategoryBreakdownMockHandler(emptyCategoryBreakdown),
  ...emptyInvestmentHandlers,
  getNetWorthMockHandler(emptyNetWorth),
  getNetWorthHistoryMockHandler({ items: [] }),
  getReportSummaryMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    return {
      ...emptyReportSummary,
      periodStart: params.get("dateFrom") ?? emptyReportSummary.periodStart,
      periodEnd: params.get("dateTo") ?? emptyReportSummary.periodEnd,
    };
  }),
  getImportPreviewMockHandler({ rows: [] }),
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

export const importFormatErrorHandlers: RequestHandler[] = [
  getImportPreviewMockHandler(failWith(importFormatProblem)),
  ...handlers,
];

export const importAllDuplicatesHandlers: RequestHandler[] = [
  getImportPreviewMockHandler(importPreviewAllDuplicates),
  ...handlers,
];

export const importPendingHandlers: RequestHandler[] = [
  getImportPreviewMockHandler(pending),
  ...handlers,
];

export const unauthenticatedHandlers: RequestHandler[] = [
  getMeMockHandler(failWith(unauthorizedProblem)),
  ...handlers,
];

export const investmentsEmptyHandlers: RequestHandler[] = [...emptyInvestmentHandlers, ...handlers];
