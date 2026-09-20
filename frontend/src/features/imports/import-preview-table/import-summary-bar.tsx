import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import { categoryTargetCount, type PreviewRowState, summarizeSelection } from "./preview-rows";

interface Props {
  rows: PreviewRowState[];
  categories: CategoryResponse[];
  onApplyCategory: (category: CategoryResponse) => void;
  disabled?: boolean;
}

export function ImportSummaryBar({
  rows,
  categories,
  onApplyCategory,
  disabled = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const summary = summarizeSelection(rows);
  const nets = summary.nets.length > 0 ? summary.nets : [{ currency: rows[0]?.currency, cents: 0 }];
  const offered = categories.filter((category) => categoryTargetCount(rows, category) > 0);
  const mixedTypes = new Set(offered.map((category) => category.type)).size > 1;
  const bulkCategory = offered.find((category) => category.id === bulkCategoryId);
  const targetCount = bulkCategory ? categoryTargetCount(rows, bulkCategory) : 0;

  function handleApply() {
    if (!bulkCategory) {
      return;
    }
    onApplyCategory(bulkCategory);
    setBulkCategoryId("");
  }

  return (
    <div className="z-10 space-y-3 border-b bg-popover py-3 md:sticky md:top-0">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="text-sm tabular-nums" role="status">
          <span className="font-semibold">
            {t("imports.selectedOf", { selected: summary.selected, total: summary.total })}
          </span>
          <span className="text-muted-foreground">
            {" · "}
            {t("imports.duplicateCount", { count: summary.duplicates })}
            {" · "}
            {t("imports.transferCount", { count: summary.transfers })}
          </span>
        </p>
        <p className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t("imports.netSelected")}</span>
          {nets.map((net) => (
            <span
              key={net.currency ?? ""}
              className={cn(
                "border-b-3 border-double border-rule pb-0.5 text-base font-semibold whitespace-nowrap tabular-nums",
                net.cents > 0 && "text-income",
                net.cents < 0 && "text-expense",
              )}
            >
              {money.formatSigned(net.cents / 100, "auto", net.currency)}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-64 min-w-0 space-y-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="import-bulk-category"
          >
            {t("imports.bulkCategory")}
          </label>
          <SelectField
            id="import-bulk-category"
            value={bulkCategory ? bulkCategoryId : ""}
            disabled={disabled || offered.length === 0}
            onChange={setBulkCategoryId}
            options={[
              { value: "", label: t("imports.bulkCategoryPlaceholder") },
              ...offered.map((category) => ({
                value: category.id,
                label: mixedTypes
                  ? `${category.name} · ${t(`transactions.${category.type}`)}`
                  : category.name,
              })),
            ]}
          />
        </div>
        <Button variant="outline" disabled={disabled || !bulkCategory} onClick={handleApply}>
          {bulkCategory
            ? t("imports.bulkApplyCount", { count: targetCount })
            : t("imports.bulkApply")}
        </Button>
      </div>
    </div>
  );
}
