import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CategoryResponse,
  ImportConfirmGroup,
  TransactionGroupResponse,
} from "@/api/generated/model";
import { createTransactionGroupBodyNameMax } from "@/api/schemas/transaction-groups/transaction-groups.zod";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { SignedAmount } from "@/components/signed-amount/signed-amount";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { categoryTargetCount, type PreviewRowState, summarizeSelection } from "./preview-rows";

const NEW_GROUP = "new";

export interface ImportGroupChoice {
  groupId: string;
  name: string;
}

export const NO_GROUP: ImportGroupChoice = { groupId: "", name: "" };

export function importGroupPayload(choice: ImportGroupChoice): ImportConfirmGroup | null {
  if (choice.groupId === NEW_GROUP) {
    return { id: null, name: choice.name.trim() };
  }
  return choice.groupId ? { id: choice.groupId, name: null } : null;
}

export function importGroupReady(choice: ImportGroupChoice) {
  return choice.groupId !== NEW_GROUP || choice.name.trim() !== "";
}

interface Props {
  rows: PreviewRowState[];
  categories: CategoryResponse[];
  groups: TransactionGroupResponse[];
  group: ImportGroupChoice;
  onApplyCategory: (category: CategoryResponse) => void;
  onGroupChange: (group: ImportGroupChoice) => void;
  disabled?: boolean;
}

export function ImportSummaryBar({
  rows,
  categories,
  groups,
  group,
  onApplyCategory,
  onGroupChange,
  disabled = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
        <p className="text-sm font-semibold tabular-nums" role="status">
          {t("imports.selectedOf", { selected: summary.selected, total: summary.total })}
        </p>
        <p className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t("imports.netSelected")}</span>
          {nets.map((net) => (
            <SignedAmount
              key={net.currency ?? ""}
              value={net.cents / 100}
              currency={net.currency}
              className="border-b-3 border-double border-rule pb-0.5 text-base font-semibold whitespace-nowrap"
            />
          ))}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full max-w-64 min-w-0 space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="import-bulk-category">
            {t("imports.bulkCategory")}
          </label>
          <ComboboxField
            id="import-bulk-category"
            value={bulkCategory ? bulkCategoryId : ""}
            disabled={disabled || offered.length === 0}
            onChange={setBulkCategoryId}
            placeholder={t("imports.bulkCategoryPlaceholder")}
            options={offered.map((category) => ({
              value: category.id,
              label: mixedTypes
                ? `${category.name} · ${t(`transactions.${category.type}`)}`
                : category.name,
            }))}
          />
        </div>
        <Button variant="outline" disabled={disabled || !bulkCategory} onClick={handleApply}>
          {bulkCategory
            ? t("imports.bulkApplyCount", { count: targetCount })
            : t("imports.bulkApply")}
        </Button>
        <div className="w-full max-w-64 min-w-0 space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="import-group">
            {t("imports.groupLabel")}
          </label>
          <ComboboxField
            id="import-group"
            value={group.groupId}
            disabled={disabled}
            onChange={(groupId) => onGroupChange({ ...group, groupId })}
            options={[
              { value: "", label: t("imports.noGroup") },
              { value: NEW_GROUP, label: t("transactions.groups.newGroup") },
              ...groups.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </div>
        {group.groupId === NEW_GROUP ? (
          <div className="w-full max-w-64 min-w-0 space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="import-group-name">
              {t("transactions.groups.name")}
            </label>
            <Input
              id="import-group-name"
              value={group.name}
              maxLength={createTransactionGroupBodyNameMax}
              placeholder={t("transactions.groups.namePlaceholder")}
              disabled={disabled}
              onChange={(event) => onGroupChange({ ...group, name: event.target.value })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
