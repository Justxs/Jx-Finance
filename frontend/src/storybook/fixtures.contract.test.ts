import { describe, expect, test } from "vitest";
import type { ZodType } from "zod";
import * as schemas from "@/api/schemas/index.zod";
import * as ledgerFixtures from "./fixtures";
import { paginate } from "./handlers/lists";
import * as investmentFixtures from "./investment-fixtures";

interface Contract {
  schema: ZodType;
  toResponse?: (fixture: unknown) => unknown;
}

const exported: Record<string, unknown> = { ...ledgerFixtures, ...investmentFixtures };

function asPage(fixture: unknown) {
  return paginate(Array.isArray(fixture) ? fixture : [], new URLSearchParams("pageSize=100000"));
}

function asItems(fixture: unknown) {
  return { items: fixture };
}

function asHousehold(fixture: unknown) {
  return { ...ledgerFixtures.familyHousehold, members: fixture };
}

function asSplitTransaction(fixture: unknown) {
  return { ...ledgerFixtures.splitTransaction, lines: fixture };
}

function asCategoryBreakdown(fixture: unknown) {
  return { ...ledgerFixtures.emptyCategoryBreakdown, items: fixture };
}

function asImportPreview(fixture: unknown) {
  return { rows: fixture };
}

function asPortfolio(fixture: unknown) {
  return { ...investmentFixtures.emptyPortfolio, holdings: [fixture] };
}

const contracts: Record<string, Contract> = {
  currentUser: { schema: schemas.MeResponse },
  currentUserWithTwoFactor: { schema: schemas.MeResponse },
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
  categories: { schema: schemas.CategoriesResponse },
  incomeCategories: { schema: schemas.CategoriesResponse },
  expenseCategories: { schema: schemas.CategoriesResponse },
  splitTransactionLines: { schema: schemas.TransactionResponse, toResponse: asSplitTransaction },
  splitTransaction: { schema: schemas.TransactionResponse },
  longDescriptionTransaction: { schema: schemas.TransactionResponse },
  uncategorisedTransaction: { schema: schemas.TransactionResponse },
  foreignCurrencyTransactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
  transactions: { schema: schemas.TransactionsResponse, toResponse: asPage },
  emptyTransactionsSummary: { schema: schemas.TransactionsSummaryResponse },
  transfers: { schema: schemas.TransfersResponse, toResponse: asPage },
  conversions: { schema: schemas.ConversionsResponse, toResponse: asPage },
  settings: { schema: schemas.SettingsResponse },
  currencies: { schema: schemas.CurrenciesResponse },
  overLimitBudget: { schema: schemas.BudgetsResponseItem },
  budgets: { schema: schemas.BudgetsResponse },
  goalWithTargetDate: { schema: schemas.GoalsResponseItem },
  openEndedGoal: { schema: schemas.GoalsResponseItem },
  completedGoal: { schema: schemas.GoalsResponseItem },
  goals: { schema: schemas.GoalsResponse },
  dueSoonBill: { schema: schemas.RecurringBillResponse },
  variableBill: { schema: schemas.RecurringBillResponse },
  overdueBill: { schema: schemas.RecurringBillResponse },
  inactiveBill: { schema: schemas.RecurringBillResponse },
  recurringBills: { schema: schemas.RecurringBillsResponse },
  notifications: { schema: schemas.NotificationsResponse },
  assets: { schema: schemas.AssetsResponse },
  debts: { schema: schemas.DebtsResponse },
  netWorth: { schema: schemas.NetWorthResponse },
  emptyNetWorth: { schema: schemas.NetWorthResponse },
  netWorthHistoryItems: { schema: schemas.NetWorthHistoryResponse, toResponse: asItems },
  netWorthHistory: { schema: schemas.NetWorthHistoryResponse },
  dashboardSummary: { schema: schemas.DashboardSummaryResponse },
  emptyDashboardSummary: { schema: schemas.DashboardSummaryResponse },
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
  emptyReportSummary: { schema: schemas.ReportSummaryResponse },
  importPreviewRows: { schema: schemas.ImportPreviewResponse, toResponse: asImportPreview },
  importPreview: { schema: schemas.ImportPreviewResponse },
  importPreviewAllDuplicates: { schema: schemas.ImportPreviewResponse },
  twoFactorSetup: { schema: schemas.SetupTwoFactorResponse },
  twoFactorRecoveryCodes: { schema: schemas.EnableTwoFactorResponse },
  loginSuccess: { schema: schemas.LoginResponse },
  loginTwoFactorRequired: { schema: schemas.LoginResponse },
  setupStatus: { schema: schemas.SetupStatusResponse },
  worldEtf: { schema: schemas.SecuritiesResponseItem },
  usStock: { schema: schemas.SecuritiesResponseItem },
  unpricedStock: { schema: schemas.SecuritiesResponseItem },
  securities: { schema: schemas.SecuritiesResponse },
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
  failedBrokerConnection: { schema: schemas.BrokerConnectionsResponseItem },
  brokerConnections: { schema: schemas.BrokerConnectionsResponse },
  brokerImportResult: { schema: schemas.ImportBrokerReportResponse },
  brokerImportNothingNew: { schema: schemas.ImportBrokerReportResponse },
};

function buildSummary() {
  return ledgerFixtures.buildTransactionsSummary(ledgerFixtures.transactions);
}

function buildBreakdown() {
  return asCategoryBreakdown(
    ledgerFixtures.buildCategoryBreakdownItems(ledgerFixtures.transactions),
  );
}

function buildReport() {
  return ledgerFixtures.buildReportSummary("2026-08-01", "2026-09-30");
}

const builtResponses: Record<string, { schema: ZodType; build: () => unknown }> = {
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
};

const problemDetailsWithoutGeneratedSchema = [
  "importFormatProblem",
  "serverErrorProblem",
  "unauthorizedProblem",
  "notFoundProblem",
  "validationProblem",
  "oversellProblem",
  "duplicateSecurityProblem",
  "brokerSyncProblem",
];

const notApiResponses = [
  "FIXTURE_TODAY",
  "FIXTURE_MONTH",
  "FIXTURE_MONTH_START",
  "FIXTURE_MONTH_END",
  "FIXTURE_YEAR_START",
  "ids",
  "ratesPerEuro",
  "transactionsCsv",
];

const schemaExclusions: Record<string, string> = {};

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

describe("storybook fixtures match the generated response schemas", () => {
  test.each(Object.keys(contracts).filter((name) => !(name in schemaExclusions)))("%s", (name) => {
    const contract = contracts[name]!;
    expect(name in exported, `${name} is no longer exported by the fixtures`).toBe(true);
    const fixture = exported[name];
    const response = contract.toResponse ? contract.toResponse(fixture) : fixture;
    expect(describeIssues(name, contract.schema, response)).toEqual([]);
  });

  test.each(Object.keys(builtResponses))("%s result", (name) => {
    const built = builtResponses[name]!;
    expect(describeIssues(name, built.schema, built.build())).toEqual([]);
  });

  test("every exported fixture is checked or explicitly listed as not checkable", () => {
    const accounted = new Set([
      ...Object.keys(contracts),
      ...problemDetailsWithoutGeneratedSchema,
      ...notApiResponses,
    ]);
    expect(fixtureNames().filter((name) => !accounted.has(name))).toEqual([]);
  });

  test("the lists of unchecked names only hold existing exports", () => {
    const listed = [
      ...problemDetailsWithoutGeneratedSchema,
      ...notApiResponses,
      ...Object.keys(schemaExclusions),
    ];
    expect(listed.filter((name) => !(name in exported))).toEqual([]);
  });
});
