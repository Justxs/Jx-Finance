import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type AccountResponse,
  type CategoryResponse,
  type TagResponse,
  TransactionSortField,
} from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Input } from "@/components/ui/input/input";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import type { SortDirection } from "@/lib/sort";
import { type TransactionTypeFilter, useTransactionFilters } from "../use-transaction-filters";

const SEARCH_DEBOUNCE_MS = 300;

type SortValue = `${TransactionSortField}:${SortDirection}`;

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  className?: string;
  defaultOpen?: boolean;
}

export function TransactionsFiltersDialog({
  accounts,
  categories,
  tags,
  className,
  defaultOpen = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const filters = useTransactionFilters({ accounts, categories });
  const { search, setFilter, activeCount } = filters;
  const [open, setOpen] = useState(defaultOpen);
  const text = useDebouncedDraft(
    search.search ?? "",
    (next) => setFilter({ search: next || undefined }),
    SEARCH_DEBOUNCE_MS,
  );

  function clearAll() {
    text.cancel();
    filters.clearFilters();
  }

  const columnLabels: Record<TransactionSortField, string> = {
    date: t("transactions.date"),
    description: t("transactions.description"),
    category: t("transactions.category"),
    account: t("transactions.account"),
    amount: t("transactions.amount"),
  };

  const sortOptions = Object.values(TransactionSortField).flatMap((field) => [
    {
      sort: field,
      direction: "desc" as const,
      value: `${field}:desc` as SortValue,
      label: t("transactions.sortDescending", { column: columnLabels[field] }),
    },
    {
      sort: field,
      direction: "asc" as const,
      value: `${field}:asc` as SortValue,
      label: t("transactions.sortAscending", { column: columnLabels[field] }),
    },
  ]);

  const sortValue: SortValue = `${search.sort ?? "date"}:${search.direction ?? "desc"}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <ListFilter />
        {t("transactions.filters")}
        {activeCount > 0 ? <span className="tabular-nums">· {activeCount}</span> : null}
      </Button>

      <Modal open={open} onOpenChange={setOpen} title={t("transactions.filtersTitle")}>
        <div className="space-y-4">
          <FieldShell id="tx-filter-search" label={t("transactions.description")}>
            <Input
              id="tx-filter-search"
              type="search"
              placeholder={t("transactions.searchPlaceholder")}
              value={text.draft}
              onChange={(event) => text.change(event.target.value)}
            />
          </FieldShell>

          <FieldShell id="tx-filter-type" label={t("transactions.type")}>
            <SelectField<TransactionTypeFilter>
              id="tx-filter-type"
              value={search.type ?? ""}
              onChange={(value) => setFilter({ type: value || undefined })}
              options={filters.typeOptions}
            />
          </FieldShell>

          <FieldShell id="tx-filter-date" label={t("transactions.date")}>
            <DateRangePicker
              id="tx-filter-date"
              value={filters.dateRange}
              onChange={filters.setDateRange}
            />
          </FieldShell>

          <FieldShell id="tx-filter-category" label={t("transactions.category")}>
            <SelectField
              id="tx-filter-category"
              value={search.categoryId ?? ""}
              onChange={(value) => setFilter({ categoryId: value || undefined })}
              options={filters.categoryOptions}
            />
          </FieldShell>

          {tags.length > 0 ? (
            <FieldShell id="tx-filter-tags" label={t("tags.field")} hint={t("tags.filterHint")}>
              <TagPicker
                id="tx-filter-tags"
                tags={tags}
                value={filters.selectedTagIds}
                onChange={filters.setTagIds}
                aria-label={t("tags.field")}
                aria-describedby="tx-filter-tags-hint"
              />
            </FieldShell>
          ) : null}

          <FieldShell id="tx-filter-account" label={t("transactions.account")}>
            <SelectField
              id="tx-filter-account"
              value={search.accountId ?? ""}
              onChange={(value) => setFilter({ accountId: value || undefined })}
              options={filters.accountOptions}
            />
          </FieldShell>

          <FieldShell id="tx-filter-sort" label={t("transactions.sortBy")}>
            <SelectField<SortValue>
              id="tx-filter-sort"
              value={sortValue}
              onChange={(value) => {
                const chosen = sortOptions.find((option) => option.value === value);
                if (chosen) {
                  filters.setSort(chosen.sort, chosen.direction);
                }
              }}
              options={sortOptions}
            />
          </FieldShell>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={activeCount === 0} onClick={clearAll}>
              {t("transactions.clearFilters")}
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("transactions.done")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
