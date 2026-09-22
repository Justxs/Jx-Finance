import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Input } from "@/components/ui/input/input";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useTransactionFilters } from "../use-transaction-filters";

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
  const { fields, activeCount } = filters;
  const [open, setOpen] = useState(defaultOpen);
  const text = useDebouncedDraft(fields.search.value, fields.search.set, fields.search.debounceMs);

  function clearAll() {
    text.cancel();
    filters.clearFilters();
  }

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
          <FieldShell id="tx-filter-search" label={fields.search.label}>
            <Input
              id="tx-filter-search"
              type="search"
              placeholder={fields.search.placeholder}
              value={text.draft}
              onChange={(event) => text.change(event.target.value)}
            />
          </FieldShell>

          <FieldShell id="tx-filter-type" label={fields.type.label}>
            <SelectField
              id="tx-filter-type"
              value={fields.type.value}
              onChange={fields.type.set}
              options={fields.type.options}
            />
          </FieldShell>

          <FieldShell id="tx-filter-date" label={fields.date.label}>
            <DateRangePicker
              id="tx-filter-date"
              value={fields.date.value}
              onChange={fields.date.set}
            />
          </FieldShell>

          <FieldShell id="tx-filter-category" label={fields.category.label}>
            <SelectField
              id="tx-filter-category"
              value={fields.category.value}
              onChange={fields.category.set}
              options={fields.category.options}
            />
          </FieldShell>

          {tags.length > 0 ? (
            <FieldShell id="tx-filter-tags" label={fields.tags.label} hint={fields.tags.hint}>
              <TagPicker
                id="tx-filter-tags"
                tags={tags}
                value={fields.tags.value}
                onChange={fields.tags.set}
                aria-label={fields.tags.label}
                aria-describedby="tx-filter-tags-hint"
              />
            </FieldShell>
          ) : null}

          <FieldShell id="tx-filter-account" label={fields.account.label}>
            <SelectField
              id="tx-filter-account"
              value={fields.account.value}
              onChange={fields.account.set}
              options={fields.account.options}
            />
          </FieldShell>

          <FieldShell id="tx-filter-sort" label={fields.sort.label}>
            <SelectField
              id="tx-filter-sort"
              value={fields.sort.value}
              onChange={fields.sort.set}
              options={fields.sort.options}
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
