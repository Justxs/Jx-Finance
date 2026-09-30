import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { useSearchTable } from "@/hooks/use-search-table";
import { useFeature } from "@/hooks/use-settings";
import { namedOptions } from "@/lib/options";
import { UNCATEGORIZED_OPTION } from "./transaction-amount/transaction-row";
import {
  type AmountRangeDraft,
  SEARCH_DEBOUNCE_MS,
  type TransactionSortValue,
  type TransactionTypeFilter,
  sortFieldLabels,
  amountRangeDraft,
  parseAmountRange,
  sortOptions,
  typeOptions,
} from "./transaction-filter-fields";
import {
  type TransactionFilter,
  formatTagIds,
  parseTagIds,
  transactionFilterParams,
} from "./transaction-queries";

interface Args {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function useTransactionFilters({ accounts, categories }: Args) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });
  function patchSearch(patch: Partial<typeof search>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  }
  const table = useSearchTable(search, patchSearch);
  const unusualEnabled = useFeature("unusualAmounts");
  const locationsEnabled = useFeature("locations");

  const activeCount = [
    search.search,
    search.payee,
    locationsEnabled && search.place,
    search.type,
    search.dateFrom || search.dateTo,
    search.amountMin !== undefined || search.amountMax !== undefined,
    search.categoryId || search.uncategorized,
    search.accountId,
    search.tagIds,
    unusualEnabled && search.unusual,
  ].filter(Boolean).length;

  const selectedTagIds = parseTagIds(search.tagIds);
  const typeValue: TransactionTypeFilter = search.type ?? "";
  const dateRange = { from: search.dateFrom ?? "", to: search.dateTo ?? "" };
  const columnLabels = sortFieldLabels(t);
  const sorts = sortOptions(t);
  const categoryOptions = [
    { value: "", label: t("transactions.allCategories") },
    { value: UNCATEGORIZED_OPTION, label: t("transactions.uncategorized") },
    ...namedOptions(categories),
  ];
  const sortValue: TransactionSortValue = `${search.sort ?? "date"}:${search.direction ?? "desc"}`;

  function setTagIds(next: string[]) {
    patchSearch({ tagIds: formatTagIds(next) });
  }

  function setSortValue(next: TransactionSortValue) {
    const chosen = sorts.find((option) => option.value === next);
    if (chosen) {
      table.setSort(chosen.sort, chosen.direction);
    }
  }

  const fields = {
    search: {
      label: columnLabels.description,
      placeholder: t("transactions.searchPlaceholder"),
      value: search.search ?? "",
      debounceMs: SEARCH_DEBOUNCE_MS,
      set: (next: string) => patchSearch({ search: next || undefined }),
    },
    place: {
      label: t("transactions.place.label"),
      enabled: locationsEnabled,
      value: search.place ?? "",
      debounceMs: SEARCH_DEBOUNCE_MS,
      set: (next: string) => patchSearch({ place: next || undefined }),
      setWithSearch: (nextSearch: string, nextPlace: string) =>
        patchSearch({ search: nextSearch || undefined, place: nextPlace || undefined }),
    },
    payee: {
      label: t("filters.payee"),
      value: search.payee ?? "",
      set: (next: string) => patchSearch({ payee: next || undefined }),
    },
    type: {
      label: t("transactions.type"),
      value: typeValue,
      options: typeOptions(t),
      set: (next: TransactionTypeFilter) => patchSearch({ type: next || undefined }),
    },
    date: {
      label: columnLabels.date,
      value: dateRange,
      active: Boolean(search.dateFrom) || Boolean(search.dateTo),
      set: (range: { from: string; to: string }) =>
        patchSearch({
          dateFrom: range.from || undefined,
          dateTo: range.to || undefined,
          spreadOverlap: undefined,
        }),
      clear: () =>
        patchSearch({ dateFrom: undefined, dateTo: undefined, spreadOverlap: undefined }),
    },
    category: {
      label: columnLabels.category,
      value: search.uncategorized ? UNCATEGORIZED_OPTION : (search.categoryId ?? ""),
      options: categoryOptions,
      set: (next: string) =>
        patchSearch(
          next === UNCATEGORIZED_OPTION
            ? { categoryId: undefined, uncategorized: true }
            : { categoryId: next || undefined, uncategorized: undefined },
        ),
    },
    account: {
      label: columnLabels.account,
      value: search.accountId ?? "",
      options: namedOptions(accounts, t("transactions.allAccounts")),
      set: (next: string) => patchSearch({ accountId: next || undefined }),
    },
    tags: {
      label: t("tags.field"),
      hint: t("tags.filterHint"),
      value: selectedTagIds,
      active: selectedTagIds.length > 0,
      set: setTagIds,
      clear: () => setTagIds([]),
    },
    amount: {
      set: (type: TransactionTypeFilter, unusual: boolean, range: AmountRangeDraft) =>
        patchSearch({
          type: type || undefined,
          unusual: unusual || undefined,
          ...parseAmountRange(range),
        }),
    },
    amountRange: {
      label: t("filters.amountRange"),
      value: { amountMin: search.amountMin, amountMax: search.amountMax },
      draft: amountRangeDraft(search),
      active: search.amountMin !== undefined || search.amountMax !== undefined,
      set: (next: AmountRangeDraft) => patchSearch(parseAmountRange(next)),
      clear: () => patchSearch({ amountMin: undefined, amountMax: undefined }),
    },
    unusual: {
      label: t("transactions.unusual.only"),
      enabled: unusualEnabled,
      value: search.unusual === true,
      set: (next: boolean) => patchSearch({ unusual: next || undefined }),
    },
    sort: {
      label: t("transactions.sortBy"),
      value: sortValue,
      options: sorts,
      set: setSortValue,
    },
  };

  function clearFilters() {
    void navigate({ search: (prev) => ({ page: 1, sort: prev.sort, direction: prev.direction }) });
  }

  function clearAll() {
    void navigate({ search: { page: 1 } });
  }

  function applyFilter(filter: TransactionFilter) {
    void navigate({
      search: (prev) => ({
        ...filter,
        page: 1,
        sort: prev.sort,
        direction: prev.direction,
      }),
    });
  }

  const { spreadOverlap: _spreadOverlap, ...currentFilter } = transactionFilterParams(search);

  return {
    ...table,
    search,
    currentFilter,
    applyFilter,
    fields,
    columnLabels,
    activeCount,
    clearFilters,
    clearAll,
  };
}

export type TransactionFilters = ReturnType<typeof useTransactionFilters>;
