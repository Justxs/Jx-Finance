import { HttpResponse, delay, http } from "msw";
import type { RequestHandler } from "msw";
import type {
  AccountResponse,
  AssetResponse,
  BudgetResponse,
  CategoryBreakdownResponse,
  CategoryResponse,
  ConfirmRecurringBillResponse,
  DebtResponse,
  GoalResponse,
  HouseholdResponse,
  ImportConfirmResponse,
  LoginResponse,
  MonthlyTrendResponse,
  NotificationResponse,
  ProblemDetails,
  RecurringBillResponse,
  ReportSummaryResponse,
  TransactionLineResponse,
  TransactionResponse,
  TransferResponse,
  UserProfileResponse,
} from "@/api/generated/model";
import {
  FIXTURE_MONTH,
  FIXTURE_MONTH_END,
  FIXTURE_MONTH_START,
  FIXTURE_TODAY,
  accounts,
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
  familyHousehold,
  goals,
  households,
  importPreview,
  loginSuccess,
  loginTwoFactorRequired,
  monthlyTrendItems,
  netWorth,
  netWorthHistory,
  notFoundProblem,
  notifications,
  ping,
  recurringBills,
  reportSummaryYear,
  serverErrorProblem,
  setupStatus,
  toCents,
  transactions,
  transactionsBetween,
  transactionsCsv,
  transfers,
  twoFactorRecoveryCodes,
  twoFactorSetup,
  unauthorizedProblem,
  users,
} from "./fixtures";

type Body = Record<string, unknown>;

const NEW_ID = "dddddddd-0000-4000-8000-000000000001";
const NEW_TRANSACTION_ID = "dddddddd-0000-4000-8000-000000000002";
const NEW_USER_ID = "dddddddd-0000-4000-8000-000000000003";
const CREATED_AT = `${FIXTURE_TODAY}T07:30:00Z`;
const PROBLEM_HEADERS = { "Content-Type": "application/problem+json" };

function api(path: string): string {
  return `*/api${path}`;
}

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

function problem(body: ProblemDetails, status: number) {
  return HttpResponse.json(body, { status, headers: PROBLEM_HEADERS });
}

function notFound() {
  return problem(notFoundProblem, 404);
}

function noContent() {
  return new HttpResponse(null, { status: 204 });
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
  http.get(api("/accounts"), ({ request }) =>
    HttpResponse.json(filterAccounts(new URL(request.url).searchParams)),
  ),
  http.post(api("/accounts"), async ({ request }) => {
    const created: AccountResponse = {
      ...checkingAccount,
      id: NEW_ID,
      description: null,
      iban: null,
      createdAt: CREATED_AT,
    };
    const merged = mergeAccount(created, await readBody(request));
    return HttpResponse.json(
      { ...merged, currentBalance: merged.startingBalance },
      { status: 201 },
    );
  }),
  http.get(api("/accounts/:id"), ({ params }) => {
    const found = byId(accounts, params.id);
    return found ? HttpResponse.json(found) : notFound();
  }),
  http.put(api("/accounts/:id"), async ({ params, request }) => {
    const found = byId(accounts, params.id);
    return found ? HttpResponse.json(mergeAccount(found, await readBody(request))) : notFound();
  }),
  http.delete(api("/accounts/:id"), noContent),
];

const assetHandlers = [
  http.get(api("/assets"), () => HttpResponse.json(assets)),
  http.post(api("/assets"), async ({ request }) => {
    const created: AssetResponse = {
      id: NEW_ID,
      name: "",
      type: "other",
      currentValue: "0.00",
      asOf: FIXTURE_TODAY,
      ...(await readBody(request)),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put(api("/assets/:id"), async ({ params, request }) => {
    const found = byId(assets, params.id);
    const updated: AssetResponse | undefined = found && { ...found, ...(await readBody(request)) };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/assets/:id"), noContent),
];

const authHandlers = [
  http.get(api("/auth/me"), () => HttpResponse.json(currentUser)),
  http.post(api("/auth/login"), async ({ request }) => {
    const body = await readBody(request);
    if (body.password === "wrong") {
      return problem(
        { ...unauthorizedProblem, instance: "/api/auth/login", detail: "Invalid credentials." },
        401,
      );
    }
    const needsCode = (text(body.email) ?? "").includes("2fa") && !text(body.twoFactorCode);
    const response: LoginResponse = needsCode ? loginTwoFactorRequired : loginSuccess;
    return HttpResponse.json(response);
  }),
  http.post(api("/auth/logout"), noContent),
  http.post(api("/auth/2fa/setup"), () => HttpResponse.json(twoFactorSetup)),
  http.post(api("/auth/2fa/enable"), () => HttpResponse.json(twoFactorRecoveryCodes)),
  http.post(api("/auth/2fa/disable"), noContent),
];

const budgetHandlers = [
  http.get(api("/budgets"), () => HttpResponse.json(budgets)),
  http.post(api("/budgets"), async ({ request }) => {
    const base: BudgetResponse = {
      id: NEW_ID,
      categoryId: "",
      categoryName: "",
      limitAmount: "0.00",
      spent: "0.00",
      remaining: "0.00",
      period: "Monthly",
    };
    return HttpResponse.json(mergeBudget(base, await readBody(request)), { status: 201 });
  }),
  http.put(api("/budgets/:id"), async ({ params, request }) => {
    const found = byId(budgets, params.id);
    return found ? HttpResponse.json(mergeBudget(found, await readBody(request))) : notFound();
  }),
  http.delete(api("/budgets/:id"), noContent),
];

const categoryHandlers = [
  http.get(api("/categories"), () => HttpResponse.json(categories)),
  http.post(api("/categories"), async ({ request }) => {
    const base: CategoryResponse = {
      id: NEW_ID,
      name: "",
      type: "expense",
      icon: null,
      isDefault: false,
      scope: "personal",
      householdId: null,
    };
    return HttpResponse.json(mergeCategory(base, await readBody(request)), { status: 201 });
  }),
  http.put(api("/categories/:id"), async ({ params, request }) => {
    const found = byId(categories, params.id);
    return found ? HttpResponse.json(mergeCategory(found, await readBody(request))) : notFound();
  }),
  http.delete(api("/categories/:id"), noContent),
];

const dashboardHandlers = [
  http.get(api("/dashboard/summary"), () => HttpResponse.json(dashboardSummary)),
  http.get(api("/dashboard/monthly-trend"), ({ request }) =>
    HttpResponse.json(resolveTrend(new URL(request.url).searchParams)),
  ),
  http.get(api("/dashboard/category-breakdown"), ({ request }) =>
    HttpResponse.json(resolveBreakdown(new URL(request.url).searchParams)),
  ),
];

const debtHandlers = [
  http.get(api("/debts"), () => HttpResponse.json(debts)),
  http.post(api("/debts"), async ({ request }) => {
    const created: DebtResponse = {
      id: NEW_ID,
      name: "",
      type: "other",
      outstandingAmount: "0.00",
      interestRate: null,
      asOf: FIXTURE_TODAY,
      ...(await readBody(request)),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put(api("/debts/:id"), async ({ params, request }) => {
    const found = byId(debts, params.id);
    const updated: DebtResponse | undefined = found && { ...found, ...(await readBody(request)) };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/debts/:id"), noContent),
];

const goalHandlers = [
  http.get(api("/goals"), () => HttpResponse.json(goals)),
  http.post(api("/goals"), async ({ request }) => {
    const created: GoalResponse = {
      id: NEW_ID,
      name: "",
      targetAmount: "0.00",
      currentAmount: "0.00",
      targetDate: null,
      ...(await readBody(request)),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put(api("/goals/:id"), async ({ params, request }) => {
    const found = byId(goals, params.id);
    const updated: GoalResponse | undefined = found && { ...found, ...(await readBody(request)) };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/goals/:id"), noContent),
];

const householdHandlers = [
  http.get(api("/households"), () => HttpResponse.json(households)),
  http.post(api("/households"), async ({ request }) => {
    const body = await readBody(request);
    const created: HouseholdResponse = {
      id: NEW_ID,
      name: text(body.name) ?? "",
      myRole: "owner",
      members: familyHousehold.members.slice(0, 1),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(api("/households/:id"), ({ params }) => {
    const found = byId(households, params.id);
    return found ? HttpResponse.json(found) : notFound();
  }),
  http.put(api("/households/:id"), async ({ params, request }) => {
    const found = byId(households, params.id);
    const body = await readBody(request);
    const updated: HouseholdResponse | undefined = found && {
      ...found,
      name: text(body.name) ?? found.name,
    };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/households/:id"), noContent),
  http.post(api("/households/:id/members"), async ({ params, request }) => {
    const found = byId(households, params.id);
    return found ? HttpResponse.json(withAddedMember(found, await readBody(request))) : notFound();
  }),
  http.put(api("/households/:id/members/:userId"), async ({ params, request }) => {
    const found = byId(households, params.id);
    const body = await readBody(request);
    const updated: HouseholdResponse | undefined = found && {
      ...found,
      members: found.members.map((member) =>
        member.userId === params.userId
          ? { ...member, role: body.role === "owner" ? "owner" : "member" }
          : member,
      ),
    };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/households/:id/members/:userId"), ({ params }) => {
    const found = byId(households, params.id);
    const updated: HouseholdResponse | undefined = found && {
      ...found,
      members: found.members.filter((member) => member.userId !== params.userId),
    };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
];

const importHandlers = [
  http.post(api("/import/swedbank/preview"), () => HttpResponse.json(importPreview)),
  http.post(api("/import/swedbank/confirm"), async ({ request }) => {
    const body = await readBody(request);
    const rows = Array.isArray(body.rows) ? body.rows.length : 0;
    const result: ImportConfirmResponse = {
      imported: rows,
      skippedDuplicates: Math.max(0, importPreview.rows.length - rows),
    };
    return HttpResponse.json(result);
  }),
];

const netWorthHandlers = [
  http.get(api("/networth"), () => HttpResponse.json(netWorth)),
  http.get(api("/networth/history"), () => HttpResponse.json(netWorthHistory)),
];

const notificationHandlers = [
  http.get(api("/notifications"), ({ request }) => {
    const unread = new URL(request.url).searchParams.get("unread") === "true";
    const items: NotificationResponse[] = unread
      ? notifications.filter((item) => !item.isRead)
      : notifications;
    return HttpResponse.json(items);
  }),
  http.post(api("/notifications/read-all"), noContent),
  http.patch(api("/notifications/:id/read"), noContent),
];

const pingHandlers = [http.get(api("/ping"), () => HttpResponse.json(ping))];

const recurringBillHandlers = [
  http.get(api("/recurring-bills"), () => HttpResponse.json(recurringBills)),
  http.post(api("/recurring-bills"), async ({ request }) => {
    const created: RecurringBillResponse = {
      ...dueSoonBill,
      id: NEW_ID,
      isActive: true,
      ...(await readBody(request)),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(api("/recurring-bills/:id"), ({ params }) => {
    const found = byId(recurringBills, params.id);
    return found ? HttpResponse.json(found) : notFound();
  }),
  http.put(api("/recurring-bills/:id"), async ({ params, request }) => {
    const found = byId(recurringBills, params.id);
    const updated: RecurringBillResponse | undefined = found && {
      ...found,
      ...(await readBody(request)),
    };
    return updated ? HttpResponse.json(updated) : notFound();
  }),
  http.delete(api("/recurring-bills/:id"), noContent),
  http.post(api("/recurring-bills/:id/confirm"), ({ params }) => {
    const found = byId(recurringBills, params.id);
    if (!found) {
      return notFound();
    }
    const [year, month, day] = found.nextDueDate.split("-").map(Number);
    const next = new Date(Date.UTC(year ?? 2026, month ?? 9, day ?? 1));
    const result: ConfirmRecurringBillResponse = {
      bill: { ...found, nextDueDate: next.toISOString().slice(0, 10) },
      transactionId: NEW_TRANSACTION_ID,
    };
    return HttpResponse.json(result);
  }),
];

const reportHandlers = [
  http.get(api("/reports/summary"), ({ request }) =>
    HttpResponse.json(resolveReport(new URL(request.url).searchParams)),
  ),
];

const setupHandlers = [
  http.get(api("/setup/status"), () => HttpResponse.json(setupStatus)),
  http.post(api("/setup"), async ({ request }) =>
    HttpResponse.json(mergeProfile(currentUser, await readBody(request)), { status: 201 }),
  ),
];

const transactionHandlers = [
  http.get(api("/transactions/export/pdf"), () =>
    HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF-1.4\n%%EOF\n").buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="transactions.pdf"',
      },
    }),
  ),
  http.get(api("/transactions/export"), () =>
    HttpResponse.text(transactionsCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    }),
  ),
  http.get(api("/transactions"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json(paginate(filterTransactions(params), params));
  }),
  http.post(api("/transactions"), async ({ request }) => {
    const base: TransactionResponse = {
      id: NEW_TRANSACTION_ID,
      accountId: checkingAccount.id,
      categoryId: null,
      type: "expense",
      amount: "0.00",
      date: FIXTURE_TODAY,
      description: null,
      source: "manual",
      isSplit: false,
      createdAt: CREATED_AT,
      lines: null,
    };
    return HttpResponse.json(mergeTransaction(base, await readBody(request)), { status: 201 });
  }),
  http.get(api("/transactions/:id"), ({ params }) => {
    const found = byId(transactions, params.id);
    return found ? HttpResponse.json(found) : notFound();
  }),
  http.put(api("/transactions/:id"), async ({ params, request }) => {
    const found = byId(transactions, params.id);
    return found ? HttpResponse.json(mergeTransaction(found, await readBody(request))) : notFound();
  }),
  http.delete(api("/transactions/:id"), noContent),
];

const transferHandlers = [
  http.get(api("/transfers"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const date = params.get("date");
    return HttpResponse.json(
      paginate(
        transfers.filter((item) => !date || item.date === date),
        params,
      ),
    );
  }),
  http.post(api("/transfers"), async ({ request }) => {
    const created: TransferResponse = {
      id: NEW_ID,
      fromAccountId: checkingAccount.id,
      toAccountId: checkingAccount.id,
      amount: "0.00",
      date: FIXTURE_TODAY,
      description: null,
      createdAt: CREATED_AT,
      ...(await readBody(request)),
    };
    return HttpResponse.json(created, { status: 201 });
  }),
  http.delete(api("/transfers/:id"), noContent),
];

const userHandlers = [
  http.get(api("/users"), ({ request }) =>
    HttpResponse.json(filterUsers(new URL(request.url).searchParams)),
  ),
  http.post(api("/users"), async ({ request }) => {
    const base: UserProfileResponse = {
      id: NEW_USER_ID,
      email: "",
      displayName: "",
      role: "Member",
      twoFactorEnabled: false,
      isActive: true,
    };
    return HttpResponse.json(mergeProfile(base, await readBody(request)), { status: 201 });
  }),
  http.put(api("/users/me"), async ({ request }) => {
    const body = await readBody(request);
    return HttpResponse.json(mergeProfile(currentUser, { displayName: body.displayName }));
  }),
  http.post(api("/users/:id/deactivate"), noContent),
  http.put(api("/users/:id/role"), async ({ params, request }) => {
    const found = byId(users, params.id);
    const body = await readBody(request);
    return found ? HttpResponse.json(mergeProfile(found, { role: body.role })) : notFound();
  }),
];

export const handlers: RequestHandler[] = [
  ...accountHandlers,
  ...assetHandlers,
  ...authHandlers,
  ...budgetHandlers,
  ...categoryHandlers,
  ...dashboardHandlers,
  ...debtHandlers,
  ...goalHandlers,
  ...householdHandlers,
  ...importHandlers,
  ...netWorthHandlers,
  ...notificationHandlers,
  ...pingHandlers,
  ...recurringBillHandlers,
  ...reportHandlers,
  ...setupHandlers,
  ...transactionHandlers,
  ...transferHandlers,
  ...userHandlers,
];

const SESSION_GET_PATHS = ["/auth/me", "/setup/status"];

export const GET_PATHS = [
  "/accounts",
  "/accounts/:id",
  "/assets",
  "/auth/me",
  "/budgets",
  "/categories",
  "/dashboard/summary",
  "/dashboard/monthly-trend",
  "/dashboard/category-breakdown",
  "/debts",
  "/goals",
  "/households",
  "/households/:id",
  "/networth",
  "/networth/history",
  "/notifications",
  "/ping",
  "/recurring-bills",
  "/recurring-bills/:id",
  "/reports/summary",
  "/setup/status",
  "/transactions/export/pdf",
  "/transactions/export",
  "/transactions",
  "/transactions/:id",
  "/transfers",
  "/users",
];

function emptyPage(request: Request) {
  return HttpResponse.json(paginate([], new URL(request.url).searchParams));
}

function emptyList() {
  return HttpResponse.json([]);
}

export const emptyHandlers: RequestHandler[] = [
  ...[
    "/accounts",
    "/assets",
    "/budgets",
    "/categories",
    "/debts",
    "/goals",
    "/households",
    "/notifications",
    "/recurring-bills",
  ].map((path) => http.get(api(path), emptyList)),
  http.get(api("/users"), () => HttpResponse.json([currentUser])),
  http.get(api("/transactions"), ({ request }) => emptyPage(request)),
  http.get(api("/transfers"), ({ request }) => emptyPage(request)),
  http.get(api("/dashboard/summary"), () => HttpResponse.json(emptyDashboardSummary)),
  http.get(api("/dashboard/monthly-trend"), () => HttpResponse.json({ items: [] })),
  http.get(api("/dashboard/category-breakdown"), () => HttpResponse.json(emptyCategoryBreakdown)),
  http.get(api("/networth"), () => HttpResponse.json(emptyNetWorth)),
  http.get(api("/networth/history"), () => HttpResponse.json({ items: [] })),
  http.get(api("/reports/summary"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    return HttpResponse.json({
      ...emptyReportSummary,
      periodStart: params.get("dateFrom") ?? emptyReportSummary.periodStart,
      periodEnd: params.get("dateTo") ?? emptyReportSummary.periodEnd,
    });
  }),
  http.post(api("/import/swedbank/preview"), () => HttpResponse.json({ rows: [] })),
  ...handlers,
];

function dataGetPaths(): string[] {
  return GET_PATHS.filter((path) => !SESSION_GET_PATHS.includes(path));
}

export const errorHandlers: RequestHandler[] = [
  ...dataGetPaths().map((path) =>
    http.get(api(path), ({ request }) =>
      problem({ ...serverErrorProblem, instance: new URL(request.url).pathname }, 500),
    ),
  ),
  ...handlers,
];

export const loadingHandlers: RequestHandler[] = [
  ...dataGetPaths().map((path) =>
    http.get(api(path), async () => {
      await delay("infinite");
      return noContent();
    }),
  ),
  ...handlers,
];

export const unauthenticatedHandlers: RequestHandler[] = [
  http.get(api("/auth/me"), () => problem(unauthorizedProblem, 401)),
  ...handlers,
];
