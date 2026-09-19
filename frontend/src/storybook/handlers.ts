import { HttpHandler, HttpResponse, delay } from "msw";
import type { HttpResponseResolver, RequestHandler } from "msw";
import {
  getCreateAccountMockHandler,
  getDeleteAccountMockHandler,
  getGetAccountMockHandler,
  getGetAccountsMockHandler,
  getUpdateAccountMockHandler,
} from "@/api/generated/accounts/accounts.msw";
import {
  getDisableTwoFactorMockHandler,
  getEnableTwoFactorMockHandler,
  getLoginMockHandler,
  getLogoutMockHandler,
  getMeMockHandler,
  getSetupTwoFactorMockHandler,
} from "@/api/generated/auth/auth.msw";
import {
  getCreateBudgetMockHandler,
  getDeleteBudgetMockHandler,
  getGetBudgetsMockHandler,
  getUpdateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import {
  getCreateCategoryMockHandler,
  getDeleteCategoryMockHandler,
  getGetCategoriesMockHandler,
  getUpdateCategoryMockHandler,
} from "@/api/generated/categories/categories.msw";
import {
  getCreateConversionMockHandler,
  getDeleteConversionMockHandler,
  getGetConversionsMockHandler,
} from "@/api/generated/conversions/conversions.msw";
import {
  getGetCurrenciesMockHandler,
  getGetExchangeRateMockHandler,
} from "@/api/generated/currencies/currencies.msw";
import {
  getGetCategoryBreakdownMockHandler,
  getGetDashboardSummaryMockHandler,
  getGetMonthlyTrendMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import {
  getCreateGoalMockHandler,
  getDeleteGoalMockHandler,
  getGetGoalsMockHandler,
  getUpdateGoalMockHandler,
} from "@/api/generated/goals/goals.msw";
import {
  getAddMemberMockHandler,
  getCreateHouseholdMockHandler,
  getDeleteHouseholdMockHandler,
  getGetHouseholdMockHandler,
  getGetHouseholdsMockHandler,
  getRemoveMemberMockHandler,
  getUpdateHouseholdMockHandler,
  getUpdateMemberRoleMockHandler,
} from "@/api/generated/households/households.msw";
import {
  getImportConfirmMockHandler,
  getImportPreviewMockHandler,
} from "@/api/generated/imports/imports.msw";
import {
  getCreateInvestmentTransactionMockHandler,
  getCreateSecurityMockHandler,
  getDeleteBrokerConnectionMockHandler,
  getDeleteInvestmentTransactionMockHandler,
  getGetBrokerConnectionsMockHandler,
  getGetInvestmentTransactionsMockHandler,
  getGetPortfolioMockHandler,
  getGetSecuritiesMockHandler,
  getImportBrokerReportMockHandler,
  getSaveBrokerConnectionMockHandler,
  getSyncBrokerConnectionMockHandler,
  getUpdateInvestmentTransactionMockHandler,
  getUpdateSecurityMockHandler,
} from "@/api/generated/investments/investments.msw";
import type {
  ConversionResponse,
  Currency,
  AccountResponse,
  BudgetResponse,
  CategoryBreakdownResponse,
  CategoryResponse,
  HouseholdResponse,
  InvestmentTransactionType,
  MonthlyTrendResponse,
  ProblemDetails,
  SecurityResponse,
  ReportSummaryResponse,
  TransactionLineResponse,
  TransactionResponse,
  TransferResponse,
  UserProfileResponse,
} from "@/api/generated/model";
import {
  getCreateAssetMockHandler,
  getCreateDebtMockHandler,
  getDeleteAssetMockHandler,
  getDeleteDebtMockHandler,
  getGetAssetsMockHandler,
  getGetDebtsMockHandler,
  getGetNetWorthHistoryMockHandler,
  getGetNetWorthMockHandler,
  getUpdateAssetMockHandler,
  getUpdateDebtMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import {
  getGetNotificationsMockHandler,
  getMarkAllNotificationsReadMockHandler,
  getMarkNotificationReadMockHandler,
} from "@/api/generated/notifications/notifications.msw";
import {
  getConfirmRecurringBillMockHandler,
  getCreateRecurringBillMockHandler,
  getDeleteRecurringBillMockHandler,
  getGetRecurringBillMockHandler,
  getGetRecurringBillsMockHandler,
  getUpdateRecurringBillMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { getGetReportSummaryMockHandler } from "@/api/generated/reports/reports.msw";
import {
  getGetPublicSettingsMockHandler,
  getGetSettingsMockHandler,
  getSyncExchangeRatesMockHandler,
  getUpdateSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import { getGetSetupStatusMockHandler, getSetupMockHandler } from "@/api/generated/setup/setup.msw";
import {
  getBulkCategorizeTransactionsMockHandler,
  getCreateTransactionMockHandler,
  getDeleteTransactionMockHandler,
  getExportTransactionsMockHandler,
  getExportTransactionsPdfMockHandler,
  getGetTransactionMockHandler,
  getGetTransactionsMockHandler,
  getGetTransactionsSummaryMockHandler,
  getUpdateTransactionMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import {
  getCreateTransferMockHandler,
  getDeleteTransferMockHandler,
  getGetTransfersMockHandler,
} from "@/api/generated/transfers/transfers.msw";
import {
  getCreateUserMockHandler,
  getDeactivateUserMockHandler,
  getGetUsersMockHandler,
  getUpdateMyProfileMockHandler,
  getUpdateUserRoleMockHandler,
} from "@/api/generated/users/users.msw";
import {
  FIXTURE_MONTH,
  FIXTURE_MONTH_END,
  FIXTURE_MONTH_START,
  FIXTURE_TODAY,
  accounts,
  buildTransactionsSummary,
  assets,
  budgets,
  buildCategoryBreakdownItems,
  buildReportSummary,
  categories,
  categoryBreakdown,
  checkingAccount,
  currentUser,
  dashboardSummary,
  debts,
  dueSoonBill,
  emptyCategoryBreakdown,
  emptyDashboardSummary,
  emptyNetWorth,
  emptyReportSummary,
  emptyTransactionsSummary,
  familyHousehold,
  goals,
  households,
  importFormatProblem,
  importPreview,
  importPreviewAllDuplicates,
  loginSuccess,
  loginTwoFactorRequired,
  monthlyTrendItems,
  netWorth,
  netWorthHistory,
  notFoundProblem,
  notifications,
  recurringBills,
  reportSummaryYear,
  serverErrorProblem,
  setupStatus,
  toCents,
  transactions,
  transactionsBetween,
  transactionsCsv,
  transfers,
  conversions,
  currencies,
  ratesPerEuro,
  settings,
  twoFactorRecoveryCodes,
  twoFactorSetup,
  unauthorizedProblem,
  users,
} from "./fixtures";
import {
  brokerConnections,
  brokerImportResult,
  duplicateSecurityProblem,
  emptyPortfolio,
  investmentTransactions,
  oversellProblem,
  portfolio,
  securities,
} from "./investment-fixtures";

type Body = Record<string, unknown>;

const NEW_ID = "dddddddd-0000-4000-8000-000000000001";
const NEW_TRANSACTION_ID = "dddddddd-0000-4000-8000-000000000002";
const NEW_USER_ID = "dddddddd-0000-4000-8000-000000000003";
const CREATED_AT = `${FIXTURE_TODAY}T07:30:00Z`;
const PROBLEM_HEADERS = { "Content-Type": "application/problem+json" };

async function readBody(request: Request): Promise<Body> {
  try {
    const body: unknown = await request.clone().json();
    return typeof body === "object" && body !== null ? (body as Body) : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function problem(body: ProblemDetails, status: number) {
  return HttpResponse.json(body, { status, headers: PROBLEM_HEADERS });
}

function notFound() {
  return problem(notFoundProblem, 404);
}

function found<T>(item: T | undefined): T {
  if (item === undefined) {
    throw notFound();
  }
  return item;
}

export function failWith(body: ProblemDetails, status: number) {
  return function fail(): never {
    throw problem(body, status);
  };
}

export function failWithStatus(status: number) {
  return function fail(): never {
    throw new HttpResponse(null, { status });
  };
}

export async function pending(): Promise<never> {
  await delay("infinite");
  throw new HttpResponse(null, { status: 204 });
}

export function onRouteOf(handler: HttpHandler, resolver: HttpResponseResolver): HttpHandler {
  return new HttpHandler(handler.info.method, handler.info.path, resolver);
}

function byId<T extends { id: string }>(items: T[], id: unknown): T | undefined {
  return items.find((item) => item.id === id);
}

function paginate<T>(items: T[], params: URLSearchParams) {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const pageSize = Math.max(1, Number(params.get("pageSize") ?? 20) || 20);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageSize, total: items.length };
}

function includesText(value: string | null | undefined, search: string): boolean {
  return (value ?? "").toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt"));
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "lt");
}

function applyDirection<T>(items: T[], params: URLSearchParams, fallback: "asc" | "desc"): T[] {
  return (params.get("direction") ?? fallback) === "desc" ? items.toReversed() : items;
}

function accountName(id: string | null): string {
  return accounts.find((item) => item.id === id)?.name ?? "";
}

function categoryName(id: string | null): string {
  return categories.find((item) => item.id === id)?.name ?? "";
}

function matchesCategory(item: TransactionResponse, categoryId: string): boolean {
  return (
    item.categoryId === categoryId ||
    (item.lines ?? []).some((line) => line.categoryId === categoryId)
  );
}

function compareTransactions(sort: string | null) {
  return function compare(a: TransactionResponse, b: TransactionResponse): number {
    switch (sort) {
      case "amount":
        return toCents(a.amount) - toCents(b.amount);
      case "description":
        return compareText(a.description, b.description);
      case "category":
        return compareText(categoryName(a.categoryId), categoryName(b.categoryId));
      case "account":
        return compareText(accountName(a.accountId), accountName(b.accountId));
      default:
        return compareText(a.date, b.date) || compareText(a.createdAt, b.createdAt);
    }
  };
}

function filterTransactions(params: URLSearchParams): TransactionResponse[] {
  const accountId = params.get("accountId");
  const categoryId = params.get("categoryId");
  const type = params.get("type");
  const search = params.get("search");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const filtered = transactions.filter(
    (item) =>
      (!accountId || item.accountId === accountId) &&
      (!categoryId || matchesCategory(item, categoryId)) &&
      (!type || item.type === type) &&
      (!search || includesText(item.description, search)) &&
      (!dateFrom || item.date >= dateFrom) &&
      (!dateTo || item.date <= dateTo),
  );
  const sorted = filtered.toSorted(compareTransactions(params.get("sort")));
  return applyDirection(sorted, params, "desc");
}

function filterAccounts(params: URLSearchParams): AccountResponse[] {
  const search = params.get("search");
  const iban = params.get("iban");
  const type = params.get("type");
  const sort = params.get("sort");
  const filtered = accounts.filter(
    (item) =>
      (!search || includesText(item.name, search) || includesText(item.description, search)) &&
      (!iban || includesText(item.iban, iban)) &&
      (!type || item.type === type),
  );
  if (!sort) {
    return filtered;
  }
  const sorted = filtered.toSorted((a, b) => {
    switch (sort) {
      case "name":
        return compareText(a.name, b.name);
      case "iban":
        return compareText(a.iban, b.iban);
      case "type":
        return compareText(a.type, b.type);
      case "startingBalance":
        return toCents(a.startingBalance) - toCents(b.startingBalance);
      case "currentBalance":
        return toCents(a.currentBalance) - toCents(b.currentBalance);
      default:
        return compareText(a.createdAt, b.createdAt);
    }
  });
  return applyDirection(sorted, params, "asc");
}

function filterUsers(params: URLSearchParams): UserProfileResponse[] {
  const search = params.get("search");
  const role = params.get("role");
  const isActive = params.get("isActive");
  const sort = params.get("sort");
  const filtered = users.filter(
    (item) =>
      (!search || includesText(item.displayName, search) || includesText(item.email, search)) &&
      (!role || item.role === role) &&
      (isActive === null || isActive === "" || String(item.isActive) === isActive),
  );
  if (!sort) {
    return filtered;
  }
  const sorted = filtered.toSorted((a, b) => {
    switch (sort) {
      case "email":
        return compareText(a.email, b.email);
      case "role":
        return compareText(a.role, b.role);
      case "status":
        return Number(b.isActive) - Number(a.isActive);
      default:
        return compareText(a.displayName, b.displayName);
    }
  });
  return applyDirection(sorted, params, "asc");
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year ?? 2026, monthNumber ?? 9, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function daysBetween(dateFrom: string, dateTo: string): number {
  return (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
}

function resolveReport(params: URLSearchParams): ReportSummaryResponse {
  const dateFrom = params.get("dateFrom") ?? FIXTURE_MONTH_START;
  const dateTo = params.get("dateTo") ?? FIXTURE_MONTH_END;
  if (daysBetween(dateFrom, dateTo) > 92) {
    return { ...reportSummaryYear, periodStart: dateFrom, periodEnd: dateTo };
  }
  return buildReportSummary(dateFrom, dateTo);
}

function resolveBreakdown(params: URLSearchParams): CategoryBreakdownResponse {
  const month = params.get("month");
  if (!month || month === FIXTURE_MONTH || !/^\d{4}-\d{2}$/.test(month)) {
    return categoryBreakdown;
  }
  const { start, end } = monthBounds(month);
  return {
    items: buildCategoryBreakdownItems(transactionsBetween(start, end)),
    periodStart: start,
    periodEnd: end,
  };
}

function resolveTrend(params: URLSearchParams): MonthlyTrendResponse {
  const months = Math.max(1, Number(params.get("months") ?? 6) || 6);
  return { items: monthlyTrendItems.slice(-months) };
}

function toLines(value: unknown): TransactionLineResponse[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return value.map((line: Body, index) => ({
    id: `dddddddd-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`,
    categoryId: text(line.categoryId),
    amount: text(line.amount) ?? "0.00",
    description: text(line.description),
  }));
}

function mergeTransaction(base: TransactionResponse, body: Body): TransactionResponse {
  const lines = "lines" in body ? toLines(body.lines) : base.lines;
  return { ...base, ...body, lines, isSplit: lines !== null };
}

function mergeBudget(base: BudgetResponse, body: Body): BudgetResponse {
  const categoryId = text(body.categoryId) ?? base.categoryId;
  const limitAmount = text(body.limitAmount) ?? base.limitAmount;
  const spent = categoryId === base.categoryId ? base.spent : "0.00";
  return {
    ...base,
    categoryId,
    categoryName: categoryName(categoryId) || base.categoryName,
    limitAmount,
    spent,
    remaining: ((toCents(limitAmount) - toCents(spent)) / 100).toFixed(2),
  };
}

function mergeCategory(base: CategoryResponse, body: Body): CategoryResponse {
  const merged: CategoryResponse = { ...base, ...body };
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

function mergeAccount(base: AccountResponse, body: Body): AccountResponse {
  const merged: AccountResponse = { ...base, ...body };
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

function mergeProfile(base: UserProfileResponse, body: Body): UserProfileResponse {
  return {
    ...base,
    email: text(body.email) ?? base.email,
    displayName: text(body.displayName) ?? base.displayName,
    role: text(body.role) ?? base.role,
  };
}

function withAddedMember(household: HouseholdResponse, body: Body): HouseholdResponse {
  const email = text(body.email) ?? "naujas.narys@example.lt";
  const known = users.find((item) => item.email === email);
  return {
    ...household,
    members: [
      ...household.members,
      {
        userId: known?.id ?? NEW_USER_ID,
        email,
        displayName: known?.displayName ?? email.split("@")[0] ?? email,
        role: body.role === "owner" ? "owner" : "member",
      },
    ],
  };
}

const accountHandlers = [
  getGetAccountsMockHandler(({ request }) => filterAccounts(new URL(request.url).searchParams)),
  getCreateAccountMockHandler(async ({ request }) => {
    const created: AccountResponse = {
      ...checkingAccount,
      id: NEW_ID,
      description: null,
      iban: null,
      createdAt: CREATED_AT,
    };
    const merged = mergeAccount(created, await readBody(request));
    return {
      ...merged,
      currentBalance: merged.startingBalance,
      reportingBalance: merged.startingBalance,
      holdingsValue: "0.00",
      balances: [{ currency: merged.currency, amount: merged.startingBalance }],
    };
  }),
  getGetAccountMockHandler(({ params }) => found(byId(accounts, params.id))),
  getUpdateAccountMockHandler(async ({ params, request }) =>
    mergeAccount(found(byId(accounts, params.id)), await readBody(request)),
  ),
  getDeleteAccountMockHandler(),
];

const assetHandlers = [
  getGetAssetsMockHandler(assets),
  getCreateAssetMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    currentValue: "0.00",
    asOf: FIXTURE_TODAY,
    ...(await readBody(request)),
  })),
  getUpdateAssetMockHandler(async ({ params, request }) => ({
    ...found(byId(assets, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteAssetMockHandler(),
];

const authHandlers = [
  getMeMockHandler(currentUser),
  getLoginMockHandler(async ({ request }) => {
    const body = await readBody(request);
    if (body.password === "wrong") {
      throw problem(
        { ...unauthorizedProblem, instance: "/api/auth/login", detail: "Invalid credentials." },
        401,
      );
    }
    const needsCode = (text(body.email) ?? "").includes("2fa") && !text(body.twoFactorCode);
    return needsCode ? loginTwoFactorRequired : loginSuccess;
  }),
  getLogoutMockHandler(),
  getSetupTwoFactorMockHandler(twoFactorSetup),
  getEnableTwoFactorMockHandler(twoFactorRecoveryCodes),
  getDisableTwoFactorMockHandler(),
];

const budgetHandlers = [
  getGetBudgetsMockHandler(budgets),
  getCreateBudgetMockHandler(async ({ request }) => {
    const base: BudgetResponse = {
      id: NEW_ID,
      categoryId: "",
      categoryName: "",
      limitAmount: "0.00",
      spent: "0.00",
      remaining: "0.00",
      period: "Monthly",
    };
    return mergeBudget(base, await readBody(request));
  }),
  getUpdateBudgetMockHandler(async ({ params, request }) =>
    mergeBudget(found(byId(budgets, params.id)), await readBody(request)),
  ),
  getDeleteBudgetMockHandler(),
];

const categoryHandlers = [
  getGetCategoriesMockHandler(categories),
  getCreateCategoryMockHandler(async ({ request }) => {
    const base: CategoryResponse = {
      id: NEW_ID,
      name: "",
      type: "expense",
      icon: null,
      isDefault: false,
      scope: "personal",
      householdId: null,
    };
    return mergeCategory(base, await readBody(request));
  }),
  getUpdateCategoryMockHandler(async ({ params, request }) =>
    mergeCategory(found(byId(categories, params.id)), await readBody(request)),
  ),
  getDeleteCategoryMockHandler(),
];

const dashboardHandlers = [
  getGetDashboardSummaryMockHandler(dashboardSummary),
  getGetMonthlyTrendMockHandler(({ request }) => resolveTrend(new URL(request.url).searchParams)),
  getGetCategoryBreakdownMockHandler(({ request }) =>
    resolveBreakdown(new URL(request.url).searchParams),
  ),
];

const debtHandlers = [
  getGetDebtsMockHandler(debts),
  getCreateDebtMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    type: "other",
    outstandingAmount: "0.00",
    interestRate: null,
    asOf: FIXTURE_TODAY,
    ...(await readBody(request)),
  })),
  getUpdateDebtMockHandler(async ({ params, request }) => ({
    ...found(byId(debts, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteDebtMockHandler(),
];

const goalHandlers = [
  getGetGoalsMockHandler(goals),
  getCreateGoalMockHandler(async ({ request }) => ({
    id: NEW_ID,
    name: "",
    targetAmount: "0.00",
    currentAmount: "0.00",
    targetDate: null,
    ...(await readBody(request)),
  })),
  getUpdateGoalMockHandler(async ({ params, request }) => ({
    ...found(byId(goals, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteGoalMockHandler(),
];

const householdHandlers = [
  getGetHouseholdsMockHandler(households),
  getCreateHouseholdMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return {
      id: NEW_ID,
      name: text(body.name) ?? "",
      myRole: "owner",
      members: familyHousehold.members.slice(0, 1),
    };
  }),
  getGetHouseholdMockHandler(({ params }) => found(byId(households, params.id))),
  getUpdateHouseholdMockHandler(async ({ params, request }) => {
    const household = found(byId(households, params.id));
    const body = await readBody(request);
    return { ...household, name: text(body.name) ?? household.name };
  }),
  getDeleteHouseholdMockHandler(),
  getAddMemberMockHandler(async ({ params, request }) =>
    withAddedMember(found(byId(households, params.id)), await readBody(request)),
  ),
  getUpdateMemberRoleMockHandler(async ({ params, request }) => {
    const household = found(byId(households, params.id));
    const body = await readBody(request);
    return {
      ...household,
      members: household.members.map((member) =>
        member.userId === params.userId
          ? { ...member, role: body.role === "owner" ? "owner" : "member" }
          : member,
      ),
    };
  }),
  getRemoveMemberMockHandler(({ params }) => {
    const household = found(byId(households, params.id));
    return {
      ...household,
      members: household.members.filter((member) => member.userId !== params.userId),
    };
  }),
];

const importHandlers = [
  getImportPreviewMockHandler(importPreview),
  getImportConfirmMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const rows: Body[] = Array.isArray(body.rows) ? body.rows : [];
    const skipped = rows.filter((row) =>
      importPreview.rows.some((item) => item.importRef === row.importRef && item.isDuplicate),
    ).length;
    return { imported: rows.length - skipped, skippedDuplicates: skipped };
  }),
];

const investmentHandlers = [
  getGetPortfolioMockHandler(({ request }) => {
    const accountId = new URL(request.url).searchParams.get("accountId");
    const held = portfolio.holdings.some((holding) => holding.accountId === accountId);
    return !accountId || held ? portfolio : emptyPortfolio;
  }),
  getGetInvestmentTransactionsMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const accountId = params.get("accountId");
    const securityId = params.get("securityId");
    const type = params.get("type");
    const items = investmentTransactions.filter(
      (item) =>
        (!accountId || item.accountId === accountId) &&
        (!securityId || item.securityId === securityId) &&
        (!type || item.type === type),
    );
    return paginate(items, params);
  }),
  getCreateInvestmentTransactionMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const security = securities.find((item) => item.id === body.securityId);
    const type = (text(body.type) ?? "buy") as InvestmentTransactionType;
    const quantity = Number(text(body.quantity) ?? 0);
    const held = portfolio.holdings.find((holding) => holding.security.id === security?.id);
    if (type === "sell" && quantity > Number(held?.quantity ?? 0)) {
      throw problem(oversellProblem, 400);
    }

    const gross = quantity * Number(text(body.price) ?? 0);
    const fee = Number(text(body.fee) ?? 0);
    const amount = Number(text(body.amount) ?? 0);
    const cashByType: Record<InvestmentTransactionType, number> = {
      buy: -(gross + fee),
      sell: gross - fee,
      dividend: amount,
      interest: amount,
      withholdingTax: -amount,
      fee: -amount,
      split: 0,
    };
    return {
      id: NEW_ID,
      accountId: text(body.accountId) ?? "",
      securityId: security?.id ?? null,
      symbol: security?.symbol ?? null,
      type,
      date: text(body.date) ?? FIXTURE_TODAY,
      quantity: text(body.quantity) ?? "0",
      price: text(body.price) ?? "0",
      fee: fee.toFixed(2),
      cashAmount: cashByType[type].toFixed(2),
      currency: security?.currency ?? ((text(body.currency) ?? "eur") as Currency),
      description: text(body.description),
      source: "manual",
      createdAt: CREATED_AT,
    };
  }),
  getUpdateInvestmentTransactionMockHandler(({ params }) =>
    found(byId(investmentTransactions, params.id)),
  ),
  getDeleteInvestmentTransactionMockHandler(),
  getGetSecuritiesMockHandler(({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
    return securities.filter((item) =>
      [item.symbol, item.name, item.isin ?? ""].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }),
  getCreateSecurityMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const exists = securities.some(
      (item) => item.symbol === body.symbol && item.currency === body.currency,
    );
    if (exists) {
      throw problem(duplicateSecurityProblem, 409);
    }

    const created: SecurityResponse = {
      id: NEW_ID,
      symbol: "",
      name: "",
      isin: null,
      exchange: null,
      type: "stock",
      currency: "eur",
      lastPrice: null,
      lastPriceDate: null,
      ...body,
    };
    const lastPriceDate = created.lastPrice ? (created.lastPriceDate ?? FIXTURE_TODAY) : null;
    return { ...created, lastPriceDate };
  }),
  getUpdateSecurityMockHandler(async ({ params, request }) => ({
    ...found(byId(securities, params.id)),
    ...(await readBody(request)),
  })),
  getImportBrokerReportMockHandler(brokerImportResult),
  getGetBrokerConnectionsMockHandler(brokerConnections),
  getSaveBrokerConnectionMockHandler(async ({ params, request }) => {
    const body = await readBody(request);
    const existing = brokerConnections.find((item) => item.accountId === params.accountId);
    return {
      accountId: String(params.accountId),
      fundingAccountId: text(body.fundingAccountId),
      queryId: text(body.queryId) ?? "",
      isEnabled: body.isEnabled !== false,
      lastSyncAt: existing?.lastSyncAt ?? null,
      lastError: null,
    };
  }),
  getDeleteBrokerConnectionMockHandler(),
  getSyncBrokerConnectionMockHandler(brokerImportResult),
];

const netWorthHandlers = [
  getGetNetWorthMockHandler(netWorth),
  getGetNetWorthHistoryMockHandler(netWorthHistory),
];

const notificationHandlers = [
  getGetNotificationsMockHandler(({ request }) => {
    const unread = new URL(request.url).searchParams.get("unread") === "true";
    return unread ? notifications.filter((item) => !item.isRead) : notifications;
  }),
  getMarkAllNotificationsReadMockHandler(),
  getMarkNotificationReadMockHandler(),
];

const recurringBillHandlers = [
  getGetRecurringBillsMockHandler(recurringBills),
  getCreateRecurringBillMockHandler(async ({ request }) => ({
    ...dueSoonBill,
    id: NEW_ID,
    isActive: true,
    ...(await readBody(request)),
  })),
  getGetRecurringBillMockHandler(({ params }) => found(byId(recurringBills, params.id))),
  getUpdateRecurringBillMockHandler(async ({ params, request }) => ({
    ...found(byId(recurringBills, params.id)),
    ...(await readBody(request)),
  })),
  getDeleteRecurringBillMockHandler(),
  getConfirmRecurringBillMockHandler(({ params }) => {
    const bill = found(byId(recurringBills, params.id));
    const [year, month, day] = bill.nextDueDate.split("-").map(Number);
    const next = new Date(Date.UTC(year ?? 2026, month ?? 9, day ?? 1));
    return {
      bill: { ...bill, nextDueDate: next.toISOString().slice(0, 10) },
      transactionId: NEW_TRANSACTION_ID,
    };
  }),
];

const reportHandlers = [
  getGetReportSummaryMockHandler(({ request }) => resolveReport(new URL(request.url).searchParams)),
];

const setupHandlers = [
  getGetSetupStatusMockHandler(setupStatus),
  getSetupMockHandler(async ({ request }) => mergeProfile(currentUser, await readBody(request))),
];

const transactionHandlers = [
  onRouteOf(getExportTransactionsPdfMockHandler(new ArrayBuffer(0)), () =>
    HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF-1.4\n%%EOF\n").buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="transactions.pdf"',
      },
    }),
  ),
  onRouteOf(getExportTransactionsMockHandler(new ArrayBuffer(0)), () =>
    HttpResponse.text(transactionsCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    }),
  ),
  getGetTransactionsSummaryMockHandler(({ request }) =>
    buildTransactionsSummary(filterTransactions(new URL(request.url).searchParams)),
  ),
  getBulkCategorizeTransactionsMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const requested = Array.isArray(body.transactionIds) ? body.transactionIds : [];
    const matched = requested.map((id) => byId(transactions, id));
    if (matched.some((item) => item === undefined)) {
      throw notFound();
    }
    return { updated: matched.length };
  }),
  getGetTransactionsMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    return paginate(filterTransactions(params), params);
  }),
  getCreateTransactionMockHandler(async ({ request }) => {
    const base: TransactionResponse = {
      id: NEW_TRANSACTION_ID,
      accountId: checkingAccount.id,
      categoryId: null,
      type: "expense",
      amount: "0.00",
      currency: "eur",
      reportingAmount: "0.00",
      date: FIXTURE_TODAY,
      description: null,
      source: "manual",
      isSplit: false,
      createdAt: CREATED_AT,
      lines: null,
    };
    return mergeTransaction(base, await readBody(request));
  }),
  getGetTransactionMockHandler(({ params }) => found(byId(transactions, params.id))),
  getUpdateTransactionMockHandler(async ({ params, request }) =>
    mergeTransaction(found(byId(transactions, params.id)), await readBody(request)),
  ),
  getDeleteTransactionMockHandler(),
];

const transferHandlers = [
  getGetTransfersMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    return paginate(
      transfers.filter((item) => !date || item.date === date),
      params,
    );
  }),
  getCreateTransferMockHandler(async ({ request }) => {
    const created: TransferResponse = {
      id: NEW_ID,
      fromAccountId: checkingAccount.id,
      toAccountId: checkingAccount.id,
      amount: "0.00",
      currency: "eur",
      receivedAmount: "0.00",
      receivedCurrency: "eur",
      date: FIXTURE_TODAY,
      description: null,
      createdAt: CREATED_AT,
      ...(await readBody(request)),
    };
    return { ...created, receivedAmount: created.receivedAmount ?? created.amount };
  }),
  getDeleteTransferMockHandler(),
];

const conversionHandlers = [
  getGetConversionsMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const accountId = params.get("accountId");
    return paginate(
      conversions.filter((item) => !accountId || item.accountId === accountId),
      params,
    );
  }),
  getCreateConversionMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const created: ConversionResponse = {
      ...conversions[0]!,
      id: NEW_ID,
      description: null,
      feeAmount: null,
      feeCurrency: null,
      feeTransactionId: null,
      createdAt: CREATED_AT,
      ...body,
    };
    const rate = Number(created.toAmount) / Number(created.fromAmount);
    return { ...created, rate: rate.toFixed(6) };
  }),
  getDeleteConversionMockHandler(),
];

const settingsHandlers = [
  getGetPublicSettingsMockHandler({
    instanceName: settings.instanceName,
    defaultLanguage: settings.defaultLanguage,
  }),
  getGetSettingsMockHandler(settings),
  getUpdateSettingsMockHandler(async ({ request }) => ({
    ...settings,
    ...(await readBody(request)),
  })),
  getSyncExchangeRatesMockHandler({ added: 62, ratesAsOf: FIXTURE_TODAY }),
];

const currencyHandlers = [
  getGetCurrenciesMockHandler(currencies),
  getGetExchangeRateMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const from = ratesPerEuro[params.get("from") as Currency];
    const to = ratesPerEuro[params.get("to") as Currency];
    if (!from || !to) {
      throw notFound();
    }

    return {
      from: params.get("from") as Currency,
      to: params.get("to") as Currency,
      rate: (to / from).toFixed(6),
      asOf: currencies.ratesAsOf ?? FIXTURE_TODAY,
    };
  }),
];

const userHandlers = [
  getGetUsersMockHandler(({ request }) => filterUsers(new URL(request.url).searchParams)),
  getCreateUserMockHandler(async ({ request }) => {
    const base: UserProfileResponse = {
      id: NEW_USER_ID,
      email: "",
      displayName: "",
      role: "Member",
      twoFactorEnabled: false,
      isActive: true,
    };
    return mergeProfile(base, await readBody(request));
  }),
  getUpdateMyProfileMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return mergeProfile(currentUser, { displayName: body.displayName });
  }),
  getDeactivateUserMockHandler(),
  getUpdateUserRoleMockHandler(async ({ params, request }) => {
    const user = found(byId(users, params.id));
    const body = await readBody(request);
    return mergeProfile(user, { role: body.role });
  }),
];

export const handlers: RequestHandler[] = [
  ...accountHandlers,
  ...assetHandlers,
  ...authHandlers,
  ...budgetHandlers,
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
  ...transactionHandlers,
  ...transferHandlers,
  ...userHandlers,
];

const SESSION_GET_PATHS = new Set([
  getMeMockHandler(currentUser).info.path,
  getGetSetupStatusMockHandler(setupStatus).info.path,
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

function emptyPage({ request }: { request: Request }) {
  return paginate<never>([], new URL(request.url).searchParams);
}

const emptyInvestmentHandlers: RequestHandler[] = [
  getGetPortfolioMockHandler(emptyPortfolio),
  getGetInvestmentTransactionsMockHandler(emptyPage),
  getGetSecuritiesMockHandler([]),
  getGetBrokerConnectionsMockHandler([]),
];

export const emptyHandlers: RequestHandler[] = [
  getGetAccountsMockHandler([]),
  getGetAssetsMockHandler([]),
  getGetBudgetsMockHandler([]),
  getGetCategoriesMockHandler([]),
  getGetDebtsMockHandler([]),
  getGetGoalsMockHandler([]),
  getGetHouseholdsMockHandler([]),
  getGetNotificationsMockHandler([]),
  getGetRecurringBillsMockHandler([]),
  getGetUsersMockHandler([currentUser]),
  getGetTransactionsSummaryMockHandler(emptyTransactionsSummary),
  getGetTransactionsMockHandler(emptyPage),
  getGetTransfersMockHandler(emptyPage),
  getGetConversionsMockHandler(emptyPage),
  getGetDashboardSummaryMockHandler(emptyDashboardSummary),
  getGetMonthlyTrendMockHandler({ items: [] }),
  getGetCategoryBreakdownMockHandler(emptyCategoryBreakdown),
  ...emptyInvestmentHandlers,
  getGetNetWorthMockHandler(emptyNetWorth),
  getGetNetWorthHistoryMockHandler({ items: [] }),
  getGetReportSummaryMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    return {
      ...emptyReportSummary,
      periodStart: params.get("dateFrom") ?? emptyReportSummary.periodStart,
      periodEnd: params.get("dateTo") ?? emptyReportSummary.periodEnd,
    };
  }),
  getImportPreviewMockHandler({ rows: [] }),
  ...handlers,
];

export const errorHandlers: RequestHandler[] = [
  ...dataGetHandlers().map((handler) =>
    onRouteOf(handler, ({ request }) =>
      problem({ ...serverErrorProblem, instance: new URL(request.url).pathname }, 500),
    ),
  ),
  ...handlers,
];

export const loadingHandlers: RequestHandler[] = [
  ...dataGetHandlers().map((handler) => onRouteOf(handler, pending)),
  ...handlers,
];

export const importFormatErrorHandlers: RequestHandler[] = [
  getImportPreviewMockHandler(failWith(importFormatProblem, 400)),
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
  getMeMockHandler(failWith(unauthorizedProblem, 401)),
  ...handlers,
];

export const investmentsEmptyHandlers: RequestHandler[] = [...emptyInvestmentHandlers, ...handlers];
