import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import type { Translate } from "./i18n";

const OPTIMISTIC_PREFIX = "optimistic-";

export function optimisticId(suffix: string | number) {
  return `${OPTIMISTIC_PREFIX}${suffix}`;
}

export function isOptimistic(row: Pick<TransactionResponse, "id">) {
  return row.id.startsWith(OPTIMISTIC_PREFIX);
}

export function isRefund(row: Pick<TransactionResponse, "type" | "amount">) {
  return row.type === "expense" && Number(row.amount) < 0;
}

export function isPurchase(row: Pick<TransactionResponse, "type" | "amount">) {
  return row.type === "expense" && Number(row.amount) > 0;
}

export function transactionCategoryLabel(
  row: Pick<TransactionResponse, "isSplit" | "categoryId">,
  categoryById: ReadonlyMap<string | undefined, CategoryResponse | undefined>,
  t: Translate,
) {
  if (row.isSplit) {
    return t("transactions.split");
  }
  return categoryById.get(row.categoryId ?? "")?.name ?? t("transactions.uncategorized");
}

export function transactionName(
  row: Pick<TransactionResponse, "description" | "isSplit" | "categoryId"> &
    Partial<Pick<TransactionResponse, "payeeName" | "payee">>,
  categoryById: ReadonlyMap<string | undefined, CategoryResponse | undefined>,
  t: Translate,
) {
  return (
    row.payeeName || row.payee || row.description || transactionCategoryLabel(row, categoryById, t)
  );
}

export const UNCATEGORIZED_OPTION = "none";
