import { useDebouncer } from "@tanstack/react-pacer";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SORT_FIELDS = ["date", "description", "category", "account", "amount"] as const;
const SEARCH_DEBOUNCE_MS = 300;

type SortField = (typeof SORT_FIELDS)[number];
type SortDirection = "asc" | "desc";
type SortValue = `${SortField}:${SortDirection}`;

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  className?: string;
  defaultOpen?: boolean;
}

export function TransactionsFiltersDialog({
  accounts,
  categories,
  className,
  defaultOpen = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState(search.search ?? "");
  const [lastSearch, setLastSearch] = useState(search.search ?? "");
  const searchDebouncer = useDebouncer((next: string) => setFilter({ search: next || undefined }), {
    wait: SEARCH_DEBOUNCE_MS,
  });

  if ((search.search ?? "") !== lastSearch) {
    setLastSearch(search.search ?? "");
    setDraft(search.search ?? "");
  }

  function setFilter(patch: Partial<typeof search>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) });
  }

  function handleSearchChange(next: string) {
    setDraft(next);
    searchDebouncer.maybeExecute(next);
  }

  function clearAll() {
    searchDebouncer.cancel();
    navigate({ search: (prev) => ({ page: 1, sort: prev.sort, direction: prev.direction }) });
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
      value: `${field}:desc` as SortValue,
      label: t("transactions.sortDescending", { column: columnLabels[field] }),
    },
    {
      value: `${field}:asc` as SortValue,
      label: t("transactions.sortAscending", { column: columnLabels[field] }),
    },
  ]);

  const sortValue: SortValue = `${search.sort ?? "date"}:${search.direction ?? "desc"}`;

  const activeCount = [
    search.search,
    search.type,
    search.dateFrom || search.dateTo,
    search.categoryId,
    search.accountId,
  ].filter(Boolean).length;

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
              value={draft}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-type">{t("transactions.type")}</Label>
            <SelectField<"" | "income" | "expense">
              id="tx-filter-type"
              value={search.type ?? ""}
              onChange={(value) => setFilter({ type: value || undefined })}
              options={[
                { value: "", label: t("transactions.allTypes") },
                { value: "expense", label: t("transactions.expense") },
                { value: "income", label: t("transactions.income") },
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-date">{t("transactions.date")}</Label>
            <DateRangePicker
              id="tx-filter-date"
              value={{ from: search.dateFrom ?? "", to: search.dateTo ?? "" }}
              onChange={(range) =>
                setFilter({ dateFrom: range.from || undefined, dateTo: range.to || undefined })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-category">{t("transactions.category")}</Label>
            <SelectField
              id="tx-filter-category"
              value={search.categoryId ?? ""}
              onChange={(value) => setFilter({ categoryId: value || undefined })}
              options={[
                { value: "", label: t("transactions.allCategories") },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-account">{t("transactions.account")}</Label>
            <SelectField
              id="tx-filter-account"
              value={search.accountId ?? ""}
              onChange={(value) => setFilter({ accountId: value || undefined })}
              options={[
                { value: "", label: t("transactions.allAccounts") },
                ...accounts.map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-filter-sort">{t("transactions.sortBy")}</Label>
            <SelectField<SortValue>
              id="tx-filter-sort"
              value={sortValue}
              onChange={(value) => {
                const [sort, direction] = value.split(":") as [SortField, SortDirection];
                navigate({ search: (prev) => ({ ...prev, sort, direction, page: 1 }) });
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
