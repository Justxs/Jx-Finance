import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";

const OPTIMISTIC_PREFIX = "optimistic-";

export function optimisticId(suffix: string | number) {
  return `${OPTIMISTIC_PREFIX}${suffix}`;
}

export function isOptimistic(row: Pick<TransactionResponse, "id">) {
  return row.id.startsWith(OPTIMISTIC_PREFIX);
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
  row: Pick<TransactionResponse, "description" | "isSplit" | "categoryId">,
  categoryById: ReadonlyMap<string | undefined, CategoryResponse | undefined>,
  t: Translate,
) {
  return row.description || transactionCategoryLabel(row, categoryById, t);
}
