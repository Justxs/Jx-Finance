import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { type TransactionTypeFilter, useTransactionFilters } from "../use-transaction-filters";

const SORT_FIELDS = ["date", "description", "category", "account", "amount"] as const;
const SEARCH_DEBOUNCE_MS = 300;

type SortField = (typeof SORT_FIELDS)[number];
type SortDirection = "asc" | "desc";
type SortValue = `${SortField}:${SortDirection}`;

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
  const filters = useTransactionFilters({ accounts, categories, tags });
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

  const columnLabels: Record<SortField, string> = {
    date: t("transactions.date"),
    description: t("transactions.description"),
    category: t("transactions.category"),
    account: t("transactions.account"),
    amount: t("transactions.amount"),
  };

  const sortOptions = SORT_FIELDS.flatMap((field) => [
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
          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-search">{t("transactions.description")}</Label>
            <Input
              id="tx-filter-search"
              type="search"
              placeholder={t("transactions.searchPlaceholder")}
              value={text.draft}
              onChange={(event) => text.change(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-type">{t("transactions.type")}</Label>
            <SelectField<TransactionTypeFilter>
              id="tx-filter-type"
              value={search.type ?? ""}
              onChange={(value) => setFilter({ type: value || undefined })}
              options={filters.typeOptions}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-date">{t("transactions.date")}</Label>
            <DateRangePicker
              id="tx-filter-date"
              value={filters.dateRange}
              onChange={filters.setDateRange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-category">{t("transactions.category")}</Label>
            <SelectField
              id="tx-filter-category"
              value={search.categoryId ?? ""}
              onChange={(value) => setFilter({ categoryId: value || undefined })}
              options={filters.categoryOptions}
            />
          </div>

          {tags.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="tx-filter-tags">{t("tags.field")}</Label>
              <TagPicker
                id="tx-filter-tags"
                tags={tags}
                value={filters.selectedTagIds}
                onChange={filters.setTagIds}
                aria-label={t("tags.field")}
                aria-describedby="tx-filter-tags-hint"
              />
              <p id="tx-filter-tags-hint" className="text-xs text-muted-foreground">
                {t("tags.filterHint")}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-account">{t("transactions.account")}</Label>
            <SelectField
              id="tx-filter-account"
              value={search.accountId ?? ""}
              onChange={(value) => setFilter({ accountId: value || undefined })}
              options={filters.accountOptions}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-sort">{t("transactions.sortBy")}</Label>
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
          </div>

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
