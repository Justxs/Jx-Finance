import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { Tooltip } from "@/components/ui/tooltip";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { ImportSummaryBar } from "./import-summary-bar";
import { ImportTransferPicker } from "./import-transfer-picker";
import {
  applyCategory,
  type PreviewRowState,
  selectAllPatch,
  summarizeSelection,
} from "./preview-rows";

interface Props {
  rows: PreviewRowState[];
  accountId: string;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onRowChange: (index: number, patch: Partial<PreviewRowState>) => void;
  onRowsChange: (rows: PreviewRowState[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmPending: boolean;
}

export function ImportPreviewTable({
  rows,
  accounts,
  accountId,
  categories,
  onRowChange,
  onRowsChange,
  onConfirm,
  onCancel,
  confirmPending,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();

  if (rows.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{t("imports.noRows")}</p>;
  }

  const summary = summarizeSelection(rows);

  return (
    <>
      <ImportSummaryBar
        rows={rows}
        categories={categories}
        disabled={confirmPending}
        onApplyCategory={(category) => onRowsChange(applyCategory(rows, category))}
      />
      {summary.selectableCount === 0 ? (
        <p className="text-sm text-foreground">{t("imports.allDuplicates")}</p>
      ) : null}
      <div className="-mx-3">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={t("imports.preview")}
          tabIndex={0}
        >
          <Table className="min-w-[48rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Tooltip content={t("imports.selectAllHint")}>
                    <Checkbox
                      aria-label={t("imports.selectAll")}
                      checked={summary.allSelected}
                      indeterminate={summary.someSelected && !summary.allSelected}
                      disabled={summary.selectableCount === 0}
                      onCheckedChange={(checked) => onRowsChange(selectAllPatch(rows, checked))}
                    />
                  </Tooltip>
                </TableHead>
                <TableHead>{t("transactions.date")}</TableHead>
                <TableHead>{t("transactions.description")}</TableHead>
                <TableHead className="text-right">{t("transactions.amount")}</TableHead>
                <TableHead>{t("transactions.category")}</TableHead>
                <TableHead>{t("imports.recordAs")}</TableHead>
                <TableHead>{t("imports.flags")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const rowCategories = categories.filter((c) => c.type === row.type);
                const rowName = [formatDate(row.date), row.payee || row.description]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <TableRow key={`${row.importRef}-${index}`}>
                    <TableCell>
                      <Checkbox
                        aria-label={t("imports.selectRow", { row: rowName })}
                        checked={row.selected}
                        onCheckedChange={(checked) => onRowChange(index, { selected: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <span
                        className="line-clamp-2 min-w-40 font-medium wrap-break-word"
                        title={row.payee || row.description || undefined}
                      >
                        {row.payee || row.description || EMPTY_VALUE}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${row.type === "income" ? "text-income" : "text-foreground"}`}
                    >
                      {row.type === "income" ? "+" : "−"}
                      {money.format(Number(row.amount), row.currency)}
                    </TableCell>
                    <TableCell>
                      <SelectField
                        aria-label={t("imports.categoryFor", { row: rowName })}
                        disabled={Boolean(row.transferAccountId)}
                        value={row.categoryId}
                        onChange={(categoryId) =>
                          onRowChange(index, { categoryId, categorySuggested: false })
                        }
                        options={[
                          { value: "", label: t("transactions.uncategorized") },
                          ...rowCategories.map((category) => ({
                            value: category.id,
                            label: category.name,
                          })),
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <ImportTransferPicker
                        row={row}
                        accounts={accounts}
                        accountId={accountId}
                        onChange={(patch) => onRowChange(index, patch)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.isDuplicate ? <Tag>{t("imports.duplicate")}</Tag> : null}
                        {row.categorySuggested && !row.transferAccountId ? (
                          <Tooltip content={t("imports.suggestedHint")}>
                            <span>
                              <Tag>{t("imports.suggested")}</Tag>
                            </span>
                          </Tooltip>
                        ) : null}
                        {row.looksLikeTransfer ? (
                          <Tag tone="accent">{t("imports.looksLikeTransfer")}</Tag>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={confirmPending} onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button pending={confirmPending} disabled={summary.selected === 0} onClick={onConfirm}>
          {t("imports.confirmCount", { count: summary.selected })}
        </Button>
      </div>
    </>
  );
}
