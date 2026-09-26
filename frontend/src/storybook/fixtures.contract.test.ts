import { describe, expect, test } from "vitest";
import type { ZodType } from "zod";
import * as schemas from "@/api/schemas/index.zod";
import * as fixtures from "./fixtures";
import { paginate } from "./handlers/lists";

interface Contract {
  schema: ZodType;
  toResponse?: (fixture: unknown) => unknown;
}

const exported: Record<string, unknown> = fixtures;

function asPage(fixture: unknown) {
  return paginate(Array.isArray(fixture) ? fixture : [], new URLSearchParams("pageSize=100000"));
}

function asList(fixture: unknown) {
  return [fixture];
}

function asItems(fixture: unknown) {
  return { items: fixture };
}

function asHousehold(fixture: unknown) {
  return { ...fixtures.familyHousehold, members: fixture };
}

function asSplitTransaction(fixture: unknown) {
  return { ...fixtures.splitTransaction, lines: fixture };
}

function asCategoryBreakdown(fixture: unknown) {
  return { ...fixtures.emptyCategoryBreakdown, items: fixture };
}

function asImportPreview(fixture: unknown) {
  return { rows: fixture };
}

function asPortfolio(fixture: unknown) {
  return { ...fixtures.emptyPortfolio, holdings: [fixture] };
}

const contracts: Record<string, Contract> = {
  currentUser: { schema: schemas.MeResponse },
  currentUserWithTwoFactor: { schema: schemas.MeResponse },
  unverifiedUser: { schema: schemas.MeResponse },
  reminderSubscriber: { schema: schemas.MeResponse },
  smtpSettings: { schema: schemas.SmtpSettingsResponse },
  smtpSettingsOff: { schema: schemas.SmtpSettingsResponse },
  smtpTestSent: { schema: schemas.SendTestEmailResponse },
  memberUser: { schema: schemas.UsersResponseItem },
  longNameUser: { schema: schemas.UsersResponseItem },
  inactiveUser: { schema: schemas.UsersResponseItem },
  users: { schema: schemas.UsersResponse },
  householdMembers: { schema: schemas.HouseholdResponse, toResponse: asHousehold },
  familyHousehold: { schema: schemas.HouseholdResponse },
  gardenHousehold: { schema: schemas.HouseholdResponse },
  households: { schema: schemas.HouseholdsResponse },
  checkingAccount: { schema: schemas.AccountResponse },
  savingsAccount: { schema: schemas.AccountResponse },
  sharedAccount: { schema: schemas.AccountResponse },
  brokerAccount: { schema: schemas.AccountResponse },
  accounts: { schema: schemas.AccountsResponse },
  archivedAccount: { schema: schemas.ArchivedAccountsResponseItem },
  archivedSharedAccount: { schema: schemas.ArchivedAccountsResponseItem },
  archivedAccounts: { schema: schemas.ArchivedAccountsResponse },
  categories: { schema: schemas.CategoriesResponse },
  tags: { schema: schemas.TagsResponse },
  categorizationRules: { schema: schemas.CategorizationRulesResponse },
  rulesRunPreview: { schema: schemas.PreviewCategorizationRunResponse },
  rulesRunNothing: { schema: schemas.PreviewCategorizationRunResponse },
  ruleTestNoMatch: { schema: schemas.TestCategorizationRuleResponse },
  ruleTestAmountOnly: { schema: schemas.TestCategorizationRuleResponse },
  incomeCategories: { schema: schemas.CategoriesResponse },
  expenseCategories: { schema: schemas.CategoriesResponse },
  splitTransactionLines: { schema: schemas.TransactionResponse, toResponse: asSplitTransaction },
  splitTransaction: { schema: schemas.TransactionResponse },
  longDescriptionTransaction: { schema: schemas.TransactionResponse },
  uncategorisedTransaction: { schema: schemas.TransactionResponse },
  foreignCurrencyTransactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
  transactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
  monthTransactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
  emptyTransactionsSummary: { schema: schemas.TransactionsSummaryResponse },
  transfers: { schema: schemas.TransfersResponse, toResponse: asPage },
  manualTransfer: { schema: schemas.UpdateTransferResponse },
  crossCurrencyTransfer: { schema: schemas.UpdateTransferResponse },
  importedFromTransfer: { schema: schemas.UpdateTransferResponse },
  importedToCrossCurrencyTransfer: { schema: schemas.UpdateTransferResponse },
  importedBothTransfer: { schema: schemas.UpdateTransferResponse },
  conversions: { schema: schemas.ConversionsResponse, toResponse: asPage },
  conversionWithFee: { schema: schemas.UpdateConversionResponse },
  conversionWithoutFee: { schema: schemas.UpdateConversionResponse },
  importedConversion: { schema: schemas.UpdateConversionResponse },
  settings: { schema: schemas.SettingsResponse },
  publicSettings: { schema: schemas.PublicSettingsResponse },
  currencies: { schema: schemas.CurrenciesResponse },
  overLimitBudget: { schema: schemas.BudgetsResponseItem },
  weeklyRolloverBudget: { schema: schemas.BudgetsResponseItem },
  budgets: { schema: schemas.BudgetsResponse },
  goalWithTargetDate: { schema: schemas.GoalsResponseItem },
  openEndedGoal: { schema: schemas.GoalsResponseItem },
  completedGoal: { schema: schemas.GoalsResponseItem },
  accountFundedGoal: { schema: schemas.GoalsResponseItem },
  sharedFundedGoal: { schema: schemas.GoalsResponseItem },
  unavailableFundedGoal: { schema: schemas.GoalsResponseItem },
  goals: { schema: schemas.GoalsResponse },
  dueSoonBill: { schema: schemas.RecurringBillResponse },
  variableBill: { schema: schemas.RecurringBillResponse },
  overdueBill: { schema: schemas.RecurringBillResponse },
  inactiveBill: { schema: schemas.RecurringBillResponse },
  incomeBill: { schema: schemas.RecurringBillResponse },
  transferBill: { schema: schemas.RecurringBillResponse },
  crossCurrencyTransferBill: { schema: schemas.RecurringBillResponse },
  recurringBills: { schema: schemas.RecurringBillsResponse },
  spotifyCandidate: { schema: schemas.SubscriptionCandidatesResponseItem },
  gymCandidate: { schema: schemas.SubscriptionCandidatesResponseItem },
  domainCandidate: { schema: schemas.SubscriptionCandidatesResponseItem },
  waterCandidate: { schema: schemas.SubscriptionCandidatesResponseItem },
  subscriptionCandidates: { schema: schemas.SubscriptionCandidatesResponse },
  budgetWarningNotification: { schema: schemas.NotificationsResponseItem },
  budgetExceededNotification: { schema: schemas.NotificationsResponseItem },
  expenseDueNotification: { schema: schemas.NotificationsResponseItem },
  incomeDueNotification: { schema: schemas.NotificationsResponseItem },
  transferDueNotification: { schema: schemas.NotificationsResponseItem },
  notifications: { schema: schemas.NotificationsResponse },
  assets: { schema: schemas.AssetsResponse },
  debts: { schema: schemas.DebtsResponse },
  zeroRateDebt: { schema: schemas.DebtsResponse, toResponse: asList },
  linearDebt: { schema: schemas.DebtsResponse, toResponse: asList },
  mortgageSchedule: { schema: schemas.DebtScheduleResponse },
  mortgageScheduleWithExtra: { schema: schemas.DebtScheduleResponse },
  zeroRateSchedule: { schema: schemas.DebtScheduleResponse },
  linearSchedule: { schema: schemas.DebtScheduleResponse },
  netWorth: { schema: schemas.NetWorthResponse },
  emptyNetWorth: { schema: schemas.NetWorthResponse },
  netWorthHistoryItems: { schema: schemas.NetWorthHistoryResponse, toResponse: asItems },
  netWorthHistory: { schema: schemas.NetWorthHistoryResponse },
  dashboardSummary: { schema: schemas.DashboardSummaryResponse },
  emptyDashboardSummary: { schema: schemas.DashboardSummaryResponse },
  defaultDashboardLayout: { schema: schemas.DashboardLayoutResponse },
  customDashboardLayout: { schema: schemas.DashboardLayoutResponse },
  hiddenCardsDashboardLayout: { schema: schemas.DashboardLayoutResponse },
  allHiddenDashboardLayout: { schema: schemas.DashboardLayoutResponse },
  monthlyTrendItems: { schema: schemas.MonthlyTrendResponse, toResponse: asItems },
  monthlyTrend: { schema: schemas.MonthlyTrendResponse },
  categoryBreakdownItems: {
    schema: schemas.CategoryBreakdownResponse,
    toResponse: asCategoryBreakdown,
  },
  categoryBreakdown: { schema: schemas.CategoryBreakdownResponse },
  emptyCategoryBreakdown: { schema: schemas.CategoryBreakdownResponse },
  reportSummaryMonth: { schema: schemas.ReportSummaryResponse },
  reportSummaryYear: { schema: schemas.ReportSummaryResponse },
  reportSummaryMonthCompared: { schema: schemas.ReportSummaryResponse },
  emptyReportSummary: { schema: schemas.ReportSummaryResponse },
  importPreviewRows: { schema: schemas.ImportPreviewResponse, toResponse: asImportPreview },
  importPreview: { schema: schemas.ImportPreviewResponse },
  importPreviewAllDuplicates: { schema: schemas.ImportPreviewResponse },
  backups: { schema: schemas.BackupsResponse },
  backupRestored: { schema: schemas.RestoreBackupResponse },
  twoFactorSetup: { schema: schemas.SetupTwoFactorResponse },
  twoFactorRecoveryCodes: { schema: schemas.EnableTwoFactorResponse },
  loginSuccess: { schema: schemas.LoginResponse },
  loginTwoFactorRequired: { schema: schemas.LoginResponse },
  sessions: { schema: schemas.SessionsResponse },
  setupStatus: { schema: schemas.SetupStatusResponse },
  worldEtf: { schema: schemas.SecuritiesResponseItem },
  usStock: { schema: schemas.SecuritiesResponseItem },
  unpricedStock: { schema: schemas.SecuritiesResponseItem },
  securities: { schema: schemas.SecuritiesResponse },
  securityPrices: { schema: schemas.SecurityPricesResponse },
  valueHistory: { schema: schemas.ValueHistoryResponse },
  partialValueHistory: { schema: schemas.ValueHistoryResponse },
  emptyValueHistory: { schema: schemas.ValueHistoryResponse },
  closedHolding: { schema: schemas.PortfolioResponse, toResponse: asPortfolio },
  losingHolding: { schema: schemas.PortfolioResponse, toResponse: asPortfolio },
  portfolio: { schema: schemas.PortfolioResponse },
  incompletePortfolio: { schema: schemas.PortfolioResponse },
  emptyPortfolio: { schema: schemas.PortfolioResponse },
  investmentTransactions: {
    schema: schemas.InvestmentTransactionsResponse,
    toResponse: asPage,
  },
  splitEntry: { schema: schemas.CreateInvestmentTransactionResponse },
  taxSummary: { schema: schemas.TaxSummaryResponse },
  emptyTaxSummary: { schema: schemas.TaxSummaryResponse },
  incompleteTaxSummary: { schema: schemas.TaxSummaryResponse },
  failedBrokerConnection: { schema: schemas.BrokerConnectionsResponseItem },
  brokerConnections: { schema: schemas.BrokerConnectionsResponse },
  brokerImportResult: { schema: schemas.ImportBrokerReportResponse },
  brokerImportNothingNew: { schema: schemas.ImportBrokerReportResponse },
  brokerImportWithWarnings: { schema: schemas.ImportBrokerReportResponse },
  trashEntries: { schema: schemas.TrashResponse, toResponse: asPage },
  maximaAttachments: { schema: schemas.AttachmentsResponse },
  splitAttachments: { schema: schemas.AttachmentsResponse },
  fullAttachments: { schema: schemas.AttachmentsResponse },
  recordedTrashEntries: { schema: schemas.TrashResponse, toResponse: asPage },
  householdAuditEvents: { schema: schemas.HouseholdAuditResponse, toResponse: asPage },
};

function buildSummary() {
  return fixtures.buildTransactionsSummary(fixtures.transactions);
}

function buildBreakdown() {
  return asCategoryBreakdown(fixtures.buildCategoryBreakdownItems(fixtures.transactions));
}

function buildTags() {
  return {
    ...fixtures.emptyReportSummary,
    expenseByTag: fixtures.buildTagBreakdownItems(fixtures.transactions),
  };
}

function buildReport() {
  return fixtures.buildReportSummary("2026-08-01", "2026-09-30");
}

function buildSchedule() {
  return fixtures.buildDebtSchedule(fixtures.linearDebt, {
    extraMonthly: "25.00",
    lumpSum: "1000.00",
    lumpSumDate: "2027-01-01",
  });
}

const builtResponses: Record<string, { schema: ZodType; build: () => unknown }> = {
  buildDebtSchedule: {
    schema: schemas.DebtScheduleResponse,
    build: buildSchedule,
  },
  buildTransactionsSummary: {
    schema: schemas.TransactionsSummaryResponse,
    build: buildSummary,
  },
  buildCategoryBreakdownItems: {
    schema: schemas.CategoryBreakdownResponse,
    build: buildBreakdown,
  },
  buildReportSummary: {
    schema: schemas.ReportSummaryResponse,
    build: buildReport,
  },
  buildTagBreakdownItems: {
    schema: schemas.ReportSummaryResponse,
    build: buildTags,
  },
};

const notApiResponses = [
  "FIXTURE_TODAY",
  "FIXTURE_MONTH",
  "FIXTURE_MONTH_START",
  "FIXTURE_MONTH_END",
  "FIXTURE_YEAR_START",
  "ids",
  "budgetWindows",
  "ratesPerEuro",
  "transactionsCsv",
  "tinyPng",
  "backupRestorePassword",
  "adminPassword",
  "resetLink",
  "monthIncomeCents",
  "monthExpenseCents",
];

function describeIssues(name: string, schema: ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) {
    return [];
  }
  return result.error.issues.map(
    (issue) => `${name} at ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
}

function fixtureNames(): string[] {
  return Object.keys(exported).filter((name) => typeof exported[name] !== "function");
}

const problems = fixtureNames().filter((name) => name.endsWith("Problem"));

describe("storybook fixtures match the generated response schemas", () => {
  test.each(Object.keys(contracts))("%s", (name) => {
    const contract = contracts[name]!;
    expect(name in exported, `${name} is no longer exported by the fixtures`).toBe(true);
    const fixture = exported[name];
    const response = contract.toResponse ? contract.toResponse(fixture) : fixture;
    expect(describeIssues(name, contract.schema, response)).toEqual([]);
  });

  test.each(problems)("%s", (name) => {
    expect(describeIssues(name, schemas.ProblemDetailsResponse, exported[name])).toEqual([]);
  });

  test.each(Object.keys(builtResponses))("%s result", (name) => {
    const built = builtResponses[name]!;
    expect(describeIssues(name, built.schema, built.build())).toEqual([]);
  });

  test("every exported fixture is checked or explicitly listed as not checkable", () => {
    const accounted = new Set([...Object.keys(contracts), ...problems, ...notApiResponses]);
    expect(fixtureNames().filter((name) => !accounted.has(name))).toEqual([]);
  });

  test("the lists of unchecked names only hold existing exports", () => {
    expect(notApiResponses.filter((name) => !(name in exported))).toEqual([]);
  });
});
