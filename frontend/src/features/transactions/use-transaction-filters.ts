import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { useSearchTable } from "@/hooks/use-search-table";
import { namedOptions } from "@/lib/options";
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

export type TransactionTypeFilter = "" | "income" | "expense";

export function useTransactionFilters({ accounts, categories }: Args) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });
  const table = useSearchTable(search, (patch) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) }),
  );

  const typeOptions: { value: TransactionTypeFilter; label: string }[] = [
    { value: "", label: t("transactions.allTypes") },
    { value: "expense", label: t("transactions.expense") },
    { value: "income", label: t("transactions.income") },
  ];

  const activeCount = [
    search.search,
    search.type,
    search.dateFrom || search.dateTo,
    search.categoryId,
    search.accountId,
    search.tagIds,
  ].filter(Boolean).length;

  const selectedTagIds = parseTagIds(search.tagIds);

  function setDateRange(range: { from: string; to: string }) {
    table.setFilter({ dateFrom: range.from || undefined, dateTo: range.to || undefined });
  }

  function setTagIds(next: string[]) {
    table.setFilter({ tagIds: formatTagIds(next) });
  }

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
    typeOptions,
    categoryOptions: namedOptions(categories, t("transactions.allCategories")),
    accountOptions: namedOptions(accounts, t("transactions.allAccounts")),
    selectedTagIds,
    setTagIds,
    dateRange: { from: search.dateFrom ?? "", to: search.dateTo ?? "" },
    setDateRange,
    activeCount,
    clearFilters,
    clearAll,
  };
}
