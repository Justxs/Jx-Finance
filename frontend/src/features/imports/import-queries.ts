import type { TransactionsParams } from "@/api/generated/model";

export const RECALL_PAGE_SIZE = 200;

export const recallParams: TransactionsParams = {
  page: 1,
  pageSize: RECALL_PAGE_SIZE,
  sort: "date",
  direction: "desc",
};
