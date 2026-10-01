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
import { Input } from "@/components/ui/input/input";
import { AmountRangeFields } from "@/features/transactions/amount-range-fields/amount-range-fields";
import { useFilterSummaries } from "@/features/transactions/use-filter-summaries";
import type {
  AmountFilterDraft,
  TransactionFilters,
} from "@/features/transactions/use-transaction-filters";
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
      fields.place.enabled ? (
        <ColumnFilter<{ search: string; place: string }>
          label={fields.search.label}
          value={{ search: fields.search.value, place: fields.place.value }}
          empty={{ search: "", place: "" }}
          shortcut={SEARCH_SHORTCUT_TARGET}
          summary={valueOf("search", "place")}
          onApply={(next) => fields.place.setWithSearch(next.search, next.place)}
        >
          {(draft, setDraft) => (
            <>
              <Input
                aria-label={fields.search.label}
                placeholder={fields.search.placeholder}
                value={draft.search}
                onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              />
              <Input
                aria-label={fields.place.label}
                placeholder={fields.place.label}
                value={draft.place}
                onChange={(event) => setDraft({ ...draft, place: event.target.value })}
              />
            </>
          )}
        </ColumnFilter>
      ) : (
        <TextColumnFilter
          label={fields.search.label}
          value={fields.search.value}
          placeholder={fields.search.placeholder}
          shortcut={SEARCH_SHORTCUT_TARGET}
          onChange={fields.search.set}
        />
      ),
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
      <ColumnFilter<AmountFilterDraft>
        label={columnLabels.amount}
        value={{
          type: fields.type.value,
          unusual: fields.unusual.value,
          duplicates: fields.duplicates.value,
          range: fields.amountRange.draft,
        }}
        empty={{ type: "", unusual: false, duplicates: false, range: { min: "", max: "" } }}
        summary={valueOf("type", "amountRange", "unusual", "duplicates")}
        onApply={fields.amount.set}
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
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={draft.duplicates}
                onCheckedChange={(duplicates) => setDraft({ ...draft, duplicates })}
              />
              {fields.duplicates.label}
            </label>
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
