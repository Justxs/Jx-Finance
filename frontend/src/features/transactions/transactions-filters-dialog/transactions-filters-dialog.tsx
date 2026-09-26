import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Modal } from "@/components/modal";
import { SelectField, type SelectOption } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Input } from "@/components/ui/input/input";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useTransactionFilters } from "../use-transaction-filters";

interface SelectFilter<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  set: (value: T) => void;
}

function FilterSelect<T extends string>({
  id,
  field,
}: Readonly<{ id: string; field: SelectFilter<T> }>) {
  return (
    <FieldShell id={id} label={field.label}>
      <SelectField id={id} value={field.value} onChange={field.set} options={field.options} />
    </FieldShell>
  );
}

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

          <FilterSelect id="tx-filter-type" field={fields.type} />

          <FieldShell id="tx-filter-date" label={fields.date.label}>
            <DateRangePicker
              id="tx-filter-date"
              value={fields.date.value}
              onChange={fields.date.set}
            />
          </FieldShell>

          <FilterSelect id="tx-filter-category" field={fields.category} />

          {tags.length > 0 ? (
            <FieldShell id="tx-filter-tags" label={fields.tags.label}>
              <TagPicker
                id="tx-filter-tags"
                tags={tags}
                value={fields.tags.value}
                onChange={fields.tags.set}
                aria-label={fields.tags.label}
                hint={fields.tags.hint}
              />
            </FieldShell>
          ) : null}

          <FilterSelect id="tx-filter-account" field={fields.account} />

          <FilterSelect id="tx-filter-sort" field={fields.sort} />

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
