import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";

const UNCATEGORIZED = "none";

interface Props {
  selected: TransactionResponse[];
  categories: CategoryResponse[];
  pending: boolean;
  onApply: (categoryId: string | null) => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selected,
  categories,
  pending,
  onApply,
  onClear,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");

  const types = new Set(selected.map((item) => item.type));
  const mixed = types.size > 1;
  const type = mixed ? undefined : selected[0]?.type;

  const options = [
    { value: UNCATEGORIZED, label: t("transactions.uncategorized") },
    ...categories
      .filter((category) => category.type === type)
      .map((category) => ({ value: category.id, label: category.name })),
  ];
  const value = !mixed && options.some((option) => option.value === choice) ? choice : "";

  return (
    <div
      role="group"
      aria-label={t("transactions.selectionToolbar")}
      className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 text-sm"
    >
      <span className="font-medium whitespace-nowrap tabular-nums" aria-live="polite">
        {t("transactions.selectedCount", { count: selected.length })}
      </span>
      <div className="w-56 max-w-full">
        <SelectField
          aria-label={t("transactions.bulkCategory")}
          aria-describedby={mixed ? "tx-selection-hint" : undefined}
          placeholder={t("transactions.bulkCategory")}
          value={value}
          onChange={setChoice}
          options={options}
          disabled={mixed || pending}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        pending={pending}
        disabled={mixed || value === ""}
        onClick={() => onApply(value === UNCATEGORIZED ? null : value)}
      >
        {t("transactions.setCategory")}
      </Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={onClear}>
        {t("transactions.clearSelection")}
      </Button>
      {mixed ? (
        <p id="tx-selection-hint" className="basis-full text-xs text-muted-foreground">
          {t("transactions.mixedTypesHint")}
        </p>
      ) : null}
    </div>
  );
}
