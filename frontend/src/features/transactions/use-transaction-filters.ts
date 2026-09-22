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
  const table = useSearchTable(search, (patch) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) }),
  );
  const { setFilter } = table;

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

  function setSearchText(next: string) {
    setFilter({ search: next || undefined });
  }

  function setType(next: TransactionTypeFilter) {
    setFilter({ type: next || undefined });
  }

  function setDateRange(range: { from: string; to: string }) {
    setFilter({ dateFrom: range.from || undefined, dateTo: range.to || undefined });
  }

  function setCategoryId(next: string) {
    setFilter({ categoryId: next || undefined });
  }

  function setAccountId(next: string) {
    setFilter({ accountId: next || undefined });
  }

  function setTagIds(next: string[]) {
    setFilter({ tagIds: formatTagIds(next) });
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
      set: setSearchText,
    },
    type: {
      label: t("transactions.type"),
      value: typeValue,
      options: typeOptions(t),
      active: Boolean(search.type),
      set: setType,
      clear: () => setFilter({ type: undefined }),
    },
    date: {
      label: columnLabels.date,
      value: dateRange,
      active: Boolean(search.dateFrom) || Boolean(search.dateTo),
      set: setDateRange,
      clear: () => setFilter({ dateFrom: undefined, dateTo: undefined }),
    },
    category: {
      label: columnLabels.category,
      value: search.categoryId ?? "",
      options: namedOptions(categories, t("transactions.allCategories")),
      active: Boolean(search.categoryId),
      set: setCategoryId,
      clear: () => setFilter({ categoryId: undefined }),
    },
    account: {
      label: columnLabels.account,
      value: search.accountId ?? "",
      options: namedOptions(accounts, t("transactions.allAccounts")),
      active: Boolean(search.accountId),
      set: setAccountId,
      clear: () => setFilter({ accountId: undefined }),
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
