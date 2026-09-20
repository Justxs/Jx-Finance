import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import {
  type AriaSort,
  ariaSortFor,
  ColumnHeader,
} from "@/components/ui/column-header/column-header";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { type TransactionTypeFilter, useTransactionFilters } from "../use-transaction-filters";

interface Args {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function useTransactionColumnHeaders({ accounts, categories }: Args) {
  const { t } = useTranslation();
  const filters = useTransactionFilters({ accounts, categories });
  const { search, setFilter } = filters;

  type SortKey = NonNullable<typeof search.sort>;

  function header(sortKey: SortKey, label: string, filter: ReactNode) {
    return <ColumnHeader label={label} {...filters.sortProps(sortKey)} filter={filter} />;
  }

  function ariaSort(sortKey: SortKey): AriaSort {
    return ariaSortFor(sortKey, search.sort, search.direction);
  }

  const ariaSortByColumn: Record<string, AriaSort> = {
    date: ariaSort("date"),
    description: ariaSort("description"),
    categoryId: ariaSort("category"),
    accountId: ariaSort("account"),
    amount: ariaSort("amount"),
  };

  const byColumn: Record<string, ReactNode> = {
    date: header(
      "date",
      t("transactions.date"),
      <ColumnFilter
        label={t("transactions.date")}
        active={Boolean(search.dateFrom) || Boolean(search.dateTo)}
        onClear={() => setFilter({ dateFrom: undefined, dateTo: undefined })}
      >
        <DateRangePicker value={filters.dateRange} onChange={filters.setDateRange} />
      </ColumnFilter>,
    ),
    description: header(
      "description",
      t("transactions.description"),
      <TextColumnFilter
        label={t("transactions.description")}
        value={search.search ?? ""}
        placeholder={t("transactions.searchPlaceholder")}
        debounceMs={300}
        shortcut="search"
        onChange={(value) => setFilter({ search: value || undefined })}
      />,
    ),
    categoryId: header(
      "category",
      t("transactions.category"),
      <ColumnFilter
        label={t("transactions.category")}
        active={Boolean(search.categoryId)}
        onClear={() => setFilter({ categoryId: undefined })}
      >
        <SelectField
          aria-label={t("transactions.category")}
          value={search.categoryId ?? ""}
          onChange={(value) => setFilter({ categoryId: value || undefined })}
          options={filters.categoryOptions}
        />
      </ColumnFilter>,
    ),
    accountId: header(
      "account",
      t("transactions.account"),
      <ColumnFilter
        label={t("transactions.account")}
        active={Boolean(search.accountId)}
        onClear={() => setFilter({ accountId: undefined })}
      >
        <SelectField
          aria-label={t("transactions.account")}
          value={search.accountId ?? ""}
          onChange={(value) => setFilter({ accountId: value || undefined })}
          options={filters.accountOptions}
        />
      </ColumnFilter>,
    ),
    amount: header(
      "amount",
      t("transactions.amount"),
      <ColumnFilter
        label={t("transactions.amount")}
        active={Boolean(search.type)}
        onClear={() => setFilter({ type: undefined })}
      >
        <SelectField<TransactionTypeFilter>
          aria-label={t("transactions.amount")}
          value={search.type ?? ""}
          onChange={(value) => setFilter({ type: value || undefined })}
          options={filters.typeOptions}
        />
      </ColumnFilter>,
    ),
  };

  return {
    byColumn,
    ariaSortByColumn,
    active: filters.activeCount > 0,
    clearAll: filters.clearAll,
  };
}
