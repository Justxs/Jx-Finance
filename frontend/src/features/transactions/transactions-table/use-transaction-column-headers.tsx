import { useNavigate, useSearch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { ColumnFilter, TextColumnFilter } from "@/components/ui/column-filter";
import { ColumnHeader } from "@/components/ui/column-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type AriaSort = "ascending" | "descending" | undefined;

interface Args {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
}

export function useTransactionColumnHeaders({ accounts, categories }: Args) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  }

  function toggleSort(key: string) {
    const sort = key as NonNullable<typeof search.sort>;
    const direction = search.sort === sort && search.direction === "asc" ? "desc" : "asc";
    navigate({ search: (prev) => ({ ...prev, sort, direction, page: 1 }) });
  }

  const active =
    Boolean(search.search) ||
    Boolean(search.accountId) ||
    Boolean(search.categoryId) ||
    Boolean(search.type) ||
    Boolean(search.dateFrom) ||
    Boolean(search.dateTo);

  function header(sortKey: string, label: string, filter: ReactNode) {
    return (
      <ColumnHeader
        label={label}
        sortKey={sortKey}
        activeSort={search.sort}
        direction={search.direction}
        onSort={toggleSort}
        filter={filter}
      />
    );
  }

  function ariaSort(sortKey: string): AriaSort {
    if (search.sort !== sortKey) {
      return undefined;
    }

    return search.direction === "desc" ? "descending" : "ascending";
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
        <DateRangePicker
          value={{ from: search.dateFrom ?? "", to: search.dateTo ?? "" }}
          onChange={(range) =>
            setFilter({ dateFrom: range.from || undefined, dateTo: range.to || undefined })
          }
        />
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
          options={[
            { value: "", label: t("transactions.allCategories") },
            ...categories.map((category) => ({ value: category.id, label: category.name })),
          ]}
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
          options={[
            { value: "", label: t("transactions.allAccounts") },
            ...accounts.map((account) => ({ value: account.id, label: account.name })),
          ]}
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
        <SelectField<"" | "income" | "expense">
          aria-label={t("transactions.amount")}
          value={search.type ?? ""}
          onChange={(value) => setFilter({ type: value || undefined })}
          options={[
            { value: "", label: t("transactions.allTypes") },
            { value: "expense", label: t("transactions.expense") },
            { value: "income", label: t("transactions.income") },
          ]}
        />
      </ColumnFilter>,
    ),
  };

  return {
    byColumn,
    ariaSortByColumn,
    active,
    clearAll: () => navigate({ search: { page: 1 } }),
  };
}
