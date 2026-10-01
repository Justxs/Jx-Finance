import { HttpResponse } from "msw";
import type {
  TransactionGroupSummary,
  TransactionLineResponse,
  TransactionResponse,
} from "@/api/generated/model";
import {
  getBulkCategorizeTransactionsMockHandler,
  getBulkTagTransactionsMockHandler,
  getCreateTransactionMockHandler,
  getDeleteTransactionMockHandler,
  getDismissUnusualAmountMockHandler,
  getExportTransactionsMockHandler,
  getKeepPossibleDuplicatesMockHandler,
  getRestoreUnusualAmountMockHandler,
  getSuggestCategoryMockHandler,
  getUncategorizedSuggestionsMockHandler,
  getExportTransactionsPdfMockHandler,
  getLedgerMockHandler,
  getPlacesMockHandler,
  getRenamePlaceMockHandler,
  getTransactionMockHandler,
  getTransactionsMockHandler,
  getTransactionsSummaryMockHandler,
  getUpdateTransactionMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { toCents } from "@/lib/money";
import {
  FIXTURE_TODAY,
  accounts,
  buildTransactionsSummary,
  categorySuggestionLearned,
  checkingAccount,
  ledgerItemsOf,
  ownPlaces,
  placeSuggestions,
  transactions,
  transactionsCsv,
  tripGroup,
  tripGroupMembers,
  uncategorizedSuggestions,
} from "@/storybook/fixtures";
import { categoryName } from "./categories";
import { notFound, onRouteOf, query, readBody, text } from "./http";
import type { Body } from "./http";
import { CREATED_AT, NEW_TRANSACTION_ID } from "./ids";
import {
  applyDirection,
  byId,
  byIdFrom,
  compareText,
  includesText,
  paginate,
  updateFrom,
} from "./lists";

function accountName(id: string | null): string {
  return accounts.find((item) => item.id === id)?.name ?? "";
}

function matchesTags(item: TransactionResponse, tagIds: string): boolean {
  return tagIds
    .split(",")
    .filter(Boolean)
    .every((tagId) => item.tagIds.includes(tagId));
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

const DUPLICATE_WINDOW_DAYS = 3;
const DAY_MS = 86_400_000;

function hasPossibleDuplicate(
  item: TransactionResponse,
  rows: readonly TransactionResponse[],
): boolean {
  return (
    toCents(item.amount) > 0 &&
    rows.some(
      (other) =>
        other.id !== item.id &&
        other.accountId === item.accountId &&
        other.type === item.type &&
        other.amount === item.amount &&
        other.currency === item.currency &&
        Math.abs(Date.parse(other.date) - Date.parse(item.date)) <=
          DUPLICATE_WINDOW_DAYS * DAY_MS &&
        (other.description ?? "").trim() === (item.description ?? "").trim(),
    )
  );
}

export function filterRows(
  rows: readonly TransactionResponse[],
  params: URLSearchParams,
): TransactionResponse[] {
  const accountId = params.get("accountId");
  const categoryId = params.get("categoryId");
  const tagIds = params.get("tagIds");
  const type = params.get("type");
  const search = params.get("search");
  const place = params.get("place");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const unusualOnly = params.get("unusual") === "true";
  const uncategorizedOnly = params.get("uncategorized") === "true";
  const duplicatesOnly = params.get("duplicates") === "true";
  const filtered = rows.filter(
    (item) =>
      (!accountId || item.accountId === accountId) &&
      (!categoryId || matchesCategory(item, categoryId)) &&
      (!tagIds || matchesTags(item, tagIds)) &&
      (!type || item.type === type) &&
      (!search || includesText(item.description, search) || includesText(item.place, search)) &&
      (!place || includesText(item.place, place)) &&
      (!dateFrom || item.date >= dateFrom) &&
      (!dateTo || item.date <= dateTo) &&
      (!unusualOnly || (item.unusual !== null && !item.unusualDismissed)) &&
      (!uncategorizedOnly ||
        (item.isSplit
          ? (item.lines ?? []).some((line) => line.categoryId === null)
          : item.categoryId === null)) &&
      (!duplicatesOnly || hasPossibleDuplicate(item, rows)),
  );
  const sorted = filtered.toSorted(compareTransactions(params.get("sort")));
  return applyDirection(sorted, params, "desc");
}

function filterTransactions(params: URLSearchParams): TransactionResponse[] {
  return filterRows(transactions, params);
}

function matchingTripGroup(params: URLSearchParams): TransactionGroupSummary[] {
  const matching = filterRows(tripGroupMembers, params);
  if (matching.length === 0) {
    return [];
  }
  const dates = matching.map((item) => item.date).toSorted();
  const net = matching.reduce(
    (sum, item) => sum + (item.type === "income" ? 1 : -1) * toCents(item.reportingAmount),
    0,
  );
  return [
    {
      ...tripGroup,
      matchingCount: matching.length,
      firstDate: dates[0] ?? tripGroup.firstDate,
      lastDate: dates.at(-1) ?? tripGroup.lastDate,
      netReportingAmount: (net / 100).toFixed(2),
    },
  ];
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

async function bulkUpdate({ request }: { request: Request }) {
  const body = await readBody(request);
  const requested = Array.isArray(body.transactionIds) ? body.transactionIds : [];
  const known = [...transactions, ...uncategorizedSuggestions.map((item) => item.transaction)];
  const matched = requested.map((id) => byId(known, id));
  if (matched.some((item) => item === undefined)) {
    throw notFound();
  }
  return { updated: matched.length };
}

export const transactionHandlers = [
  onRouteOf(getExportTransactionsPdfMockHandler(new Blob()), () =>
    HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF-1.4\n%%EOF\n").buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="transactions.pdf"',
      },
    }),
  ),
  onRouteOf(getExportTransactionsMockHandler(new Blob()), () =>
    HttpResponse.text(transactionsCsv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    }),
  ),
  getTransactionsSummaryMockHandler(({ request }) =>
    buildTransactionsSummary(filterTransactions(query(request))),
  ),
  getBulkCategorizeTransactionsMockHandler(bulkUpdate),
  getTransactionsMockHandler(({ request }) => {
    const params = query(request);
    return paginate(filterTransactions(params), params);
  }),
  getLedgerMockHandler(({ request }) => {
    const params = query(request);
    return paginate(ledgerItemsOf(filterTransactions(params), matchingTripGroup(params)), params);
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
      tagIds: [],
      attachmentCount: 0,
      unusual: null,
      unusualDismissed: false,
    };
    return mergeTransaction(base, await readBody(request));
  }),
  getPlacesMockHandler(({ request }) => {
    const params = query(request);
    const search = params.get("search");
    const places = params.get("own") === "true" ? ownPlaces : placeSuggestions;
    return places.filter((item) => !search || includesText(item.name, search));
  }),
  getRenamePlaceMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const names = Array.isArray(body.places) ? body.places : [];
    const updated = ownPlaces
      .filter((place) => names.includes(place.name))
      .reduce((sum, place) => sum + place.count, 0);
    return { updated };
  }),
  getSuggestCategoryMockHandler(categorySuggestionLearned),
  getUncategorizedSuggestionsMockHandler(uncategorizedSuggestions),
  getTransactionMockHandler(byIdFrom(transactions)),
  getUpdateTransactionMockHandler(updateFrom(transactions, mergeTransaction)),
  getDeleteTransactionMockHandler(),
  getDismissUnusualAmountMockHandler(),
  getRestoreUnusualAmountMockHandler(),
  getKeepPossibleDuplicatesMockHandler(),
  getBulkTagTransactionsMockHandler(bulkUpdate),
];
