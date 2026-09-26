import { TransactionSortField } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import type { SortDirection } from "@/lib/sort";

export const SEARCH_DEBOUNCE_MS = 300;

export type TransactionTypeFilter = "" | "income" | "expense";

export type TransactionSortValue = `${TransactionSortField}:${SortDirection}`;

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface SortOption extends FilterOption<TransactionSortValue> {
  sort: TransactionSortField;
  direction: SortDirection;
}

export function typeOptions(t: Translate): FilterOption<TransactionTypeFilter>[] {
  return [
    { value: "", label: t("transactions.allTypes") },
    { value: "expense", label: t("transactions.expense") },
    { value: "income", label: t("transactions.income") },
  ];
}

export function sortFieldLabels(t: Translate): Record<TransactionSortField, string> {
  return {
    date: t("transactions.date"),
    description: t("transactions.description"),
    category: t("transactions.category"),
    account: t("transactions.account"),
    amount: t("transactions.amount"),
  };
}

export function sortOptions(t: Translate): SortOption[] {
  const labels = sortFieldLabels(t);

  return Object.values(TransactionSortField).flatMap((field) => [
    {
      sort: field,
      direction: "desc" as const,
      value: `${field}:desc` as const,
      label: t("transactions.sortDescending", { column: labels[field] }),
    },
    {
      sort: field,
      direction: "asc" as const,
      value: `${field}:asc` as const,
      label: t("transactions.sortAscending", { column: labels[field] }),
    },
  ]);
}
