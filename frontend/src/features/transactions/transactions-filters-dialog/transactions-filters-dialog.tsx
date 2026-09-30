import { ListFilter } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field/select-field";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Input } from "@/components/ui/input/input";
import { AmountRangeFields } from "@/features/transactions/amount-range-fields/amount-range-fields";
import type { TransactionFilters } from "@/features/transactions/use-transaction-filters";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import type { SelectOption } from "@/lib/options";

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
  filters: TransactionFilters;
  tags: TagResponse[];
  className?: string;
}

export function TransactionsFiltersDialog({ filters, tags, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, activeCount } = filters;
  const [open, setOpen] = useState(false);
  const text = useDebouncedDraft(fields.search.value, fields.search.set, fields.search.debounceMs);
  const place = useDebouncedDraft(fields.place.value, fields.place.set, fields.place.debounceMs);
  const rangeKey = JSON.stringify(fields.amountRange.draft);
  const [range, setRange] = useState(fields.amountRange.draft);
  const [lastRangeKey, setLastRangeKey] = useState(rangeKey);
  if (rangeKey !== lastRangeKey) {
    setLastRangeKey(rangeKey);
    setRange(fields.amountRange.draft);
  }

  function clearAll() {
    text.cancel();
    place.cancel();
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

          {fields.place.enabled ? (
            <FieldShell id="tx-filter-place" label={fields.place.label}>
              <Input
                id="tx-filter-place"
                type="search"
                value={place.draft}
                onChange={(event) => place.change(event.target.value)}
              />
            </FieldShell>
          ) : null}

          <FilterSelect id="tx-filter-type" field={fields.type} />

          <AmountRangeFields
            label={fields.amountRange.label}
            value={range}
            onChange={setRange}
            onBlur={() => fields.amountRange.set(range)}
          />

          {fields.unusual.enabled ? (
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Checkbox checked={fields.unusual.value} onCheckedChange={fields.unusual.set} />
              {fields.unusual.label}
            </label>
          ) : null}

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
