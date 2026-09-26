import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { useSearchTable } from "@/hooks/use-search-table";
import { namedOptions } from "@/lib/options";
import {
  SEARCH_DEBOUNCE_MS,
  type TransactionSortValue,
  type TransactionTypeFilter,
  sortFieldLabels,
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

  const activeCount = [
    search.search,
    search.type,
    search.dateFrom || search.dateTo,
    search.categoryId,
    search.accountId,
    search.tagIds,
  ].filter(Boolean).length;

  const selectedTagIds = parseTagIds(search.tagIds);
  const typeValue: TransactionTypeFilter = search.type ?? "";
  const dateRange = { from: search.dateFrom ?? "", to: search.dateTo ?? "" };
  const columnLabels = sortFieldLabels(t);
  const sorts = sortOptions(t);
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
        patchSearch({ dateFrom: range.from || undefined, dateTo: range.to || undefined }),
      clear: () => patchSearch({ dateFrom: undefined, dateTo: undefined }),
    },
    category: {
      label: columnLabels.category,
      value: search.categoryId ?? "",
      options: namedOptions(categories, t("transactions.allCategories")),
      set: (next: string) => patchSearch({ categoryId: next || undefined }),
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

  return {
    ...table,
    currentFilter: transactionFilterParams(search),
    applyFilter,
    fields,
    columnLabels,
    activeCount,
    clearFilters,
    clearAll,
  };
}
