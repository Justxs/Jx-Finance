import type { FlowType, SortDirection, TransactionSortField } from "@/api/generated/model";

export interface TransactionsView {
  page: number;
  search?: string;
  accountId?: string;
  categoryId?: string;
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

export function transactionFilterParams(view: TransactionsView) {
  return {
    search: view.search,
    accountId: view.accountId,
    categoryId: view.categoryId,
    type: view.type,
    dateFrom: view.dateFrom,
    dateTo: view.dateTo,
  };
}
