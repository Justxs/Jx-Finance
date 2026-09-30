import { TransactionSortField } from "@/api/generated/model";
import type { Translate } from "@/lib/i18n";
import type { SortDirection } from "@/lib/sort";
import { isNonNegativeMoney, normalizeMoney } from "@/lib/validation";

export const SEARCH_DEBOUNCE_MS = 300;

export interface AmountRangeDraft {
  min: string;
  max: string;
}

export interface AmountRange {
  amountMin?: number;
  amountMax?: number;
}

export function amountRangeDraft({ amountMin, amountMax }: AmountRange): AmountRangeDraft {
  return { min: amountMin?.toString() ?? "", max: amountMax?.toString() ?? "" };
}

function parseAmount(text: string) {
  return isNonNegativeMoney(text) ? Number(normalizeMoney(text)) : undefined;
}

export function isAmountText(text: string) {
  return text.trim() === "" || isNonNegativeMoney(text);
}

export function parseAmountRange(draft: AmountRangeDraft): AmountRange {
  const min = parseAmount(draft.min);
  const max = parseAmount(draft.max);
  if (min !== undefined && max !== undefined && min > max) {
    return { amountMin: max, amountMax: min };
  }
  return { amountMin: min, amountMax: max };
}

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
