import type { ReactNode } from "react";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import {
  ColumnFilter,
  SelectColumnFilter,
  TextColumnFilter,
} from "@/components/ui/column-filter/column-filter";
import { ColumnHeader } from "@/components/ui/column-header/column-header";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { SEARCH_SHORTCUT_TARGET } from "@/lib/shortcuts";
import { type AriaSort, ariaSortFor } from "@/lib/sort";
import { useTransactionFilters } from "../use-transaction-filters";

interface Args {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function useTransactionColumnHeaders({ accounts, categories, tags }: Args) {
  const filters = useTransactionFilters({ accounts, categories });
  const { search, fields, columnLabels } = filters;

  type SortKey = NonNullable<typeof search.sort>;

  function header(sortKey: SortKey, filter: ReactNode) {
    return (
      <ColumnHeader label={columnLabels[sortKey]} {...filters.sortProps(sortKey)} filter={filter} />
    );
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
      <ColumnFilter
        label={fields.date.label}
        active={fields.date.active}
        onClear={fields.date.clear}
      >
        <DateRangePicker value={fields.date.value} onChange={fields.date.set} />
      </ColumnFilter>,
    ),
    description: header(
      "description",
      <TextColumnFilter
        label={fields.search.label}
        value={fields.search.value}
        placeholder={fields.search.placeholder}
        debounceMs={fields.search.debounceMs}
        shortcut={SEARCH_SHORTCUT_TARGET}
        onChange={fields.search.set}
      />,
    ),
    categoryId: header(
      "category",
      <SelectColumnFilter
        label={fields.category.label}
        value={fields.category.value}
        onChange={fields.category.set}
        options={fields.category.options}
      />,
    ),
    tagIds: (
      <ColumnHeader<string>
        label={fields.tags.label}
        filter={
          <ColumnFilter
            label={fields.tags.label}
            active={fields.tags.active}
            onClear={fields.tags.clear}
          >
            <TagPicker
              tags={tags}
              value={fields.tags.value}
              onChange={fields.tags.set}
              aria-label={fields.tags.label}
              aria-describedby="tx-tag-filter-hint"
            />
            <p id="tx-tag-filter-hint" className="text-xs text-muted-foreground">
              {fields.tags.hint}
            </p>
          </ColumnFilter>
        }
      />
    ),
    accountId: header(
      "account",
      <SelectColumnFilter
        label={fields.account.label}
        value={fields.account.value}
        onChange={fields.account.set}
        options={fields.account.options}
      />,
    ),
    amount: header(
      "amount",
      <SelectColumnFilter
        label={columnLabels.amount}
        value={fields.type.value}
        onChange={fields.type.set}
        options={fields.type.options}
      />,
    ),
  };

  return {
    byColumn,
    ariaSortByColumn,
    active: filters.activeCount > 0,
    clearAll: filters.clearAll,
  };
}
