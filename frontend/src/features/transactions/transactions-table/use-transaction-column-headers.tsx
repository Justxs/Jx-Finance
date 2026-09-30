import type { ReactNode } from "react";
import type { TagResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  ColumnFilter,
  SelectColumnFilter,
  TextColumnFilter,
} from "@/components/ui/column-filter/column-filter";
import { ColumnHeader } from "@/components/ui/column-header/column-header";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { AmountRangeFields } from "@/features/transactions/amount-range-fields/amount-range-fields";
import type {
  AmountRangeDraft,
  TransactionTypeFilter,
} from "@/features/transactions/transaction-filter-fields";
import { useFilterSummaries } from "@/features/transactions/use-filter-summaries";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";
import { SEARCH_SHORTCUT_TARGET } from "@/lib/shortcuts";
import { type AriaSort, ariaSortFor } from "@/lib/sort";

export function useTransactionColumnHeaders(filters: TransactionFilters, tags: TagResponse[]) {
  const { search, fields, columnLabels } = filters;
  const { valueOf } = useFilterSummaries(filters, tags);

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
        value={fields.date.value}
        empty={{ from: "", to: "" }}
        summary={valueOf("date")}
        onApply={fields.date.set}
      >
        {(draft, setDraft) => <DateRangePicker value={draft} onChange={setDraft} />}
      </ColumnFilter>,
    ),
    description: header(
      "description",
      <TextColumnFilter
        label={fields.search.label}
        value={fields.search.value}
        placeholder={fields.search.placeholder}
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
          <ColumnFilter<string[]>
            label={fields.tags.label}
            value={fields.tags.value}
            empty={[]}
            summary={valueOf("tags")}
            onApply={fields.tags.set}
          >
            {(draft, setDraft) => (
              <TagPicker
                tags={tags}
                value={draft}
                onChange={setDraft}
                aria-label={fields.tags.label}
                hint={fields.tags.hint}
              />
            )}
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
      <ColumnFilter<{ type: TransactionTypeFilter; unusual: boolean; range: AmountRangeDraft }>
        label={columnLabels.amount}
        value={{
          type: fields.type.value,
          unusual: fields.unusual.value,
          range: fields.amountRange.draft,
        }}
        empty={{ type: "", unusual: false, range: { min: "", max: "" } }}
        summary={valueOf("type", "amountRange", "unusual")}
        onApply={(next) => fields.amount.set(next.type, next.unusual, next.range)}
      >
        {(draft, setDraft) => (
          <>
            <SelectField
              aria-label={fields.type.label}
              value={draft.type}
              onChange={(type) => setDraft({ ...draft, type })}
              options={fields.type.options}
            />
            <AmountRangeFields
              label={fields.amountRange.label}
              value={draft.range}
              onChange={(range) => setDraft({ ...draft, range })}
            />
            {fields.unusual.enabled ? (
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox
                  checked={draft.unusual}
                  onCheckedChange={(unusual) => setDraft({ ...draft, unusual })}
                />
                {fields.unusual.label}
              </label>
            ) : null}
          </>
        )}
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
