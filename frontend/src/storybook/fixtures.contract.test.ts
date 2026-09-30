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
  return { ...fixtures.importPreview, rows: fixture };
}

function asImportStatement(fixture: unknown) {
  return { ...fixtures.importPreview, statement: fixture };
}

function asUnusualTransaction(fixture: unknown) {
  return { ...fixtures.longDescriptionTransaction, unusual: fixture };
}

function asForecast(fixture: unknown) {
  return { ...fixtures.emptyCashFlowForecast, accounts: [fixture] };
}

function asPortfolio(fixture: unknown) {
  return { ...fixtures.emptyPortfolio, holdings: [fixture] };
}

function asReceiptReading(fixture: unknown) {
  return { ...fixtures.receiptReading, result: fixture };
}

const contracts: Record<string, Contract> = {
  currentUser: { schema: schemas.MeResponse },
  currentUserWithTwoFactor: { schema: schemas.MeResponse },
  unverifiedUser: { schema: schemas.MeResponse },
  emailSubscriber: { schema: schemas.MeResponse },
  digestSubscriber: { schema: schemas.MeResponse },
  smtpSettings: { schema: schemas.SmtpSettingsResponse },
  smtpSettingsOff: { schema: schemas.SmtpSettingsResponse },
  smtpTestSent: { schema: schemas.SendTestEmailResponse },
  receiptReading: { schema: schemas.ReadReceiptResponse },
  receiptReadingWithCandidate: { schema: schemas.ReadReceiptResponse },
  receiptReadingMisread: { schema: schemas.ReadReceiptResponse },
  receiptReadingOneCategory: { schema: schemas.ReadReceiptResponse },
  receiptReadingRemembered: { schema: schemas.ReadReceiptResponse },
  receiptReadingReturn: { schema: schemas.ReadReceiptResponse },
  receiptReadingPdf: { schema: schemas.ReadReceiptResponse },
  receiptReadingUnreadLines: { schema: schemas.ReadReceiptResponse },
  maximaReceipt: { schema: schemas.ReadReceiptResponse, toResponse: asReceiptReading },
  myDiscord: { schema: schemas.MyDiscordResponse },
  myDiscordEmpty: { schema: schemas.MyDiscordResponse },
  myDiscordGone: { schema: schemas.MyDiscordResponse },
  myDiscordUnreadable: { schema: schemas.MyDiscordResponse },
  myDiscordFailing: { schema: schemas.MyDiscordResponse },
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
  atRiskAccountForecast: { schema: schemas.CashFlowForecastResponse, toResponse: asForecast },
  savingsAccountForecast: { schema: schemas.CashFlowForecastResponse, toResponse: asForecast },
  usualSpendingAccountForecast: {
    schema: schemas.CashFlowForecastResponse,
    toResponse: asForecast,
  },
  calmAccountForecast: { schema: schemas.CashFlowForecastResponse, toResponse: asForecast },
  cashFlowForecast: { schema: schemas.CashFlowForecastResponse },
  usualSpendingCashFlowForecast: { schema: schemas.CashFlowForecastResponse },
  calmCashFlowForecast: { schema: schemas.CashFlowForecastResponse },
  otherCurrenciesCashFlowForecast: { schema: schemas.CashFlowForecastResponse },
  emptyCashFlowForecast: { schema: schemas.CashFlowForecastResponse },
  categories: { schema: schemas.CategoriesResponse },
  tags: { schema: schemas.TagsResponse },
  payeeNames: { schema: schemas.PayeeNamesResponse },
  categorizationRules: { schema: schemas.CategorizationRulesResponse },
  rulesRunPreview: { schema: schemas.PreviewCategorizationRunResponse },
  suggestedRules: { schema: schemas.SuggestedRulesResponse },
  rulesRunNothing: { schema: schemas.PreviewCategorizationRunResponse },
  ruleTestNoMatch: { schema: schemas.TestCategorizationRuleResponse },
  ruleTestAmountOnly: { schema: schemas.TestCategorizationRuleResponse },
  incomeCategories: { schema: schemas.CategoriesResponse },
  expenseCategories: { schema: schemas.CategoriesResponse },
  splitTransactionLines: { schema: schemas.TransactionResponse, toResponse: asSplitTransaction },
  splitTransaction: { schema: schemas.TransactionResponse },
  longDescriptionTransaction: { schema: schemas.TransactionResponse },
  payeeUnusual: { schema: schemas.TransactionResponse, toResponse: asUnusualTransaction },
  categoryUnusual: { schema: schemas.TransactionResponse, toResponse: asUnusualTransaction },
  uncategorisedTransaction: { schema: schemas.TransactionResponse },
  refundedPurchase: { schema: schemas.TransactionResponse },
  linkedRefund: { schema: schemas.TransactionResponse },
  unlinkedRefund: { schema: schemas.TransactionResponse },
  refundTransactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
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
  budgetSuggestions: { schema: schemas.BudgetSuggestionsResponse },
  weeklyBudgetSuggestions: { schema: schemas.BudgetSuggestionsResponse },
  youngBudgetSuggestions: { schema: schemas.BudgetSuggestionsResponse },
  goalWithTargetDate: { schema: schemas.GoalsResponseItem },
  openEndedGoal: { schema: schemas.GoalsResponseItem },
  completedGoal: { schema: schemas.GoalsResponseItem },
  accountFundedGoal: { schema: schemas.GoalsResponseItem },
  sharedFundedGoal: { schema: schemas.GoalsResponseItem },
  unavailableFundedGoal: { schema: schemas.GoalsResponseItem },
  goals: { schema: schemas.GoalsResponse },
  dueSoonBill: { schema: schemas.RecurringBillResponse },
  priceRiseBill: { schema: schemas.RecurringBillResponse },
  variableBill: { schema: schemas.RecurringBillResponse },
  overdueBill: { schema: schemas.RecurringBillResponse },
  inactiveBill: { schema: schemas.RecurringBillResponse },
  incomeBill: { schema: schemas.RecurringBillResponse },
  transferBill: { schema: schemas.RecurringBillResponse },
  crossCurrencyTransferBill: { schema: schemas.RecurringBillResponse },
  mortgageBill: { schema: schemas.RecurringBillResponse },
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
  unusualAmountNotification: { schema: schemas.NotificationsResponseItem },
  unusualAmountsNotification: { schema: schemas.NotificationsResponseItem },
  priceRiseNotification: { schema: schemas.NotificationsResponseItem },
  lowBalanceNotification: { schema: schemas.NotificationsResponseItem },
  monthReadyNotification: { schema: schemas.NotificationsResponseItem },
  monthlyDigestNotification: { schema: schemas.NotificationsResponseItem },
  monthCloseYear: { schema: schemas.MonthCloseYearResponse },
  reconciliations: { schema: schemas.ReconciliationsResponse },
  matchedReconciliation: { schema: schemas.RecordReconciliationResponse },
  differingReconciliation: { schema: schemas.RecordReconciliationResponse },
  reconciliationPreview: { schema: schemas.ReconciliationPreviewResponse },
  firstReconciliationPreview: { schema: schemas.ReconciliationPreviewResponse },
  longReconciliationPreview: { schema: schemas.ReconciliationPreviewResponse },
  openMonthReview: { schema: schemas.MonthReviewResponse },
  clearOpenMonthReview: { schema: schemas.MonthReviewResponse },
  closedMonthReview: { schema: schemas.MonthReviewResponse },
  closedChangedMonthReview: { schema: schemas.MonthReviewResponse },
  currencyChangedMonthReview: { schema: schemas.MonthReviewResponse },
  notEndedMonthReview: { schema: schemas.MonthReviewResponse },
  emptyMonthReview: { schema: schemas.MonthReviewResponse },
  notifications: { schema: schemas.NotificationsResponse },
  assets: { schema: schemas.AssetsResponse },
  fullyDepreciatedAsset: { schema: schemas.AssetsResponse, toResponse: asList },
  dollarAsset: { schema: schemas.AssetsResponse, toResponse: asList },
  apartmentValuations: { schema: schemas.AssetValuationsResponse },
  carValuations: { schema: schemas.AssetValuationsResponse },
  apartmentValueHistory: { schema: schemas.AssetValueHistoryResponse },
  carValueHistory: { schema: schemas.AssetValueHistoryResponse },
  debts: { schema: schemas.DebtsResponse },
  zeroRateDebt: { schema: schemas.DebtsResponse, toResponse: asList },
  linearDebt: { schema: schemas.DebtsResponse, toResponse: asList },
  mortgageSchedule: { schema: schemas.DebtScheduleResponse },
  mortgageScheduleWithExtra: { schema: schemas.DebtScheduleResponse },
  zeroRateSchedule: { schema: schemas.DebtScheduleResponse },
  linearSchedule: { schema: schemas.DebtScheduleResponse },
  trackedMortgage: { schema: schemas.DebtsResponse, toResponse: asList },
  mortgagePayments: { schema: schemas.DebtPaymentsResponse },
  linkedPaymentTransaction: { schema: schemas.TransactionResponse },
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
  camtPreviewRows: { schema: schemas.ImportPreviewResponse, toResponse: asImportPreview },
  camtStatement: { schema: schemas.ImportPreviewResponse, toResponse: asImportStatement },
  camtPreview: { schema: schemas.ImportPreviewResponse },
  camtPreviewOtherAccount: { schema: schemas.ImportPreviewResponse },
  mappedCsvPreview: { schema: schemas.ImportPreviewResponse },
  revolutMapping: { schema: schemas.CreateCsvMappingResponse },
  csvMappings: { schema: schemas.ListCsvMappingsResponse },
  revolutInspection: { schema: schemas.InspectCsvResponse },
  revolutInspectionFitting: { schema: schemas.InspectCsvResponse },
  cardInspection: { schema: schemas.InspectCsvResponse },
  backups: { schema: schemas.BackupsResponse },
  backupRestored: { schema: schemas.RestoreBackupResponse },
  twoFactorSetup: { schema: schemas.SetupTwoFactorResponse },
  twoFactorRecoveryCodes: { schema: schemas.EnableTwoFactorResponse },
  loginSuccess: { schema: schemas.LoginResponse },
  loginTwoFactorRequired: { schema: schemas.LoginResponse },
  sessions: { schema: schemas.SessionsResponse },
  passkeys: { schema: schemas.PasskeysResponse },
  passkeyOptions: { schema: schemas.BeginPasskeyRegistrationResponse },
  personalApiTokens: { schema: schemas.PersonalApiTokensResponse },
  createdPersonalApiToken: { schema: schemas.CreatePersonalApiTokenResponse },
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
  settleUp: { schema: schemas.SettleUpResponse },
  evenSettleUp: { schema: schemas.SettleUpResponse },
  sharedExpenses: { schema: schemas.SharedExpensesResponse, toResponse: asPage },
  householdSettlements: { schema: schemas.SettlementsResponse, toResponse: asPage },
  partnerSharedAccount: { schema: schemas.AccountResponse },
  sharedPurchase: { schema: schemas.TransactionResponse },
  outdatedSharedPurchase: { schema: schemas.TransactionResponse },
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

function buildPayees() {
  return {
    ...fixtures.emptyReportSummary,
    expenseByPayee: fixtures.buildPayeeBreakdownItems(fixtures.transactions),
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
  buildPayeeBreakdownItems: {
    schema: schemas.ReportSummaryResponse,
    build: buildPayees,
  },
};

const notApiResponses = [
  "FIXTURE_TODAY",
  "FIXTURE_MONTH",
  "FIXTURE_MONTH_START",
  "FIXTURE_MONTH_END",
  "FIXTURE_YEAR_START",
  "MONTH_CLOSE_MONTH",
  "MONTH_CLOSE_CHANGED_MONTH",
  "MONTH_CLOSE_RUNNING_MONTH",
  "ids",
  "budgetWindows",
  "ratesPerEuro",
  "transactionsCsv",
  "camtStatementXml",
  "revolutCsv",
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
