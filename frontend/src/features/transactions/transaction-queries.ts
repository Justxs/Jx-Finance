import type { FlowType, SortDirection, TransactionSortField } from "@/api/generated/model";

export interface TransactionsView {
  page: number;
  search?: string;
  accountId?: string;
  categoryId?: string;
  tagIds?: string;
  type?: FlowType;
  dateFrom?: string;
  dateTo?: string;
  sort?: TransactionSortField;
  direction?: SortDirection;
}

export function transactionView(search: TransactionsView): TransactionsView {
  return {
    page: search.page,
    search: search.search,
    accountId: search.accountId,
    categoryId: search.categoryId,
    tagIds: search.tagIds,
    type: search.type,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    sort: search.sort,
    direction: search.direction,
  };
}

export function transactionListParams(view: TransactionsView, pageSize: number) {
  return { ...transactionView(view), pageSize };
}

export interface TransactionFilter {
  [key: string]: string | undefined;
  search?: string;
  accountId?: string;
  categoryId?: string;
  tagIds?: string;
  type?: FlowType;
  dateFrom?: string;
  dateTo?: string;
}

export function transactionFilterParams(view: TransactionsView): TransactionFilter {
  return {
    search: view.search,
    accountId: view.accountId,
    categoryId: view.categoryId,
    tagIds: view.tagIds,
    type: view.type,
    dateFrom: view.dateFrom,
    dateTo: view.dateTo,
  };
}

export function isEmptyFilter(filter: TransactionFilter) {
  return Object.values(filter).every((value) => value === undefined || value === "");
}

interface KnownEntities {
  accountIds: ReadonlySet<string>;
  categoryIds: ReadonlySet<string>;
  tagIds: ReadonlySet<string>;
}

export function missingFilterReferences(filter: TransactionFilter, known: KnownEntities): string[] {
  const missing: string[] = [];
  if (filter.accountId && !known.accountIds.has(filter.accountId)) {
    missing.push(filter.accountId);
  }
  if (filter.categoryId && !known.categoryIds.has(filter.categoryId)) {
    missing.push(filter.categoryId);
  }
  for (const tagId of parseTagIds(filter.tagIds)) {
    if (!known.tagIds.has(tagId)) {
      missing.push(tagId);
    }
  }
  return missing;
}

export function parseTagIds(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function formatTagIds(tagIds: readonly string[]): string | undefined {
  return tagIds.length > 0 ? tagIds.join(",") : undefined;
}
