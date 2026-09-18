import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, ImportPreviewRow } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectField } from "@/components/select-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportTransferPicker } from "./import-transfer-picker";

export interface PreviewRowState extends ImportPreviewRow {
  transferAccountId: string;
  existingTransferId: string;
  selected: boolean;
  categoryId: string;
}

interface Props {
  rows: PreviewRowState[];
  accountId: string;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onRowChange: (index: number, patch: Partial<PreviewRowState>) => void;
  onConfirm: () => void;
  confirmPending: boolean;
}

export function ImportPreviewTable({
  rows,
  accounts,
  accountId,
  categories,
  onRowChange,
  onConfirm,
  confirmPending,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("imports.noRows")}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto" role="region" aria-label={t("imports.preview")} tabIndex={0}>
        <Table className="min-w-[48rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground" />
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground">
                {t("transactions.date")}
              </TableHead>
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground">
                {t("transactions.description")}
              </TableHead>
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground text-right">
                {t("transactions.amount")}
              </TableHead>
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground">
                {t("transactions.category")}
              </TableHead>
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground">
                {t("imports.recordAs")}
              </TableHead>
              <TableHead className="py-2 pr-3 pl-0 text-xs tracking-wide text-muted-foreground">
                {t("imports.flags")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const rowCategories = categories.filter((c) => c.type === row.type);
              return (
                <TableRow key={`${row.importRef}-${index}`}>
                  <TableCell className="py-2 pr-3 pl-0">
                    <Checkbox
                      aria-label={t("imports.selectRow", { row: index + 1 })}
                      checked={row.selected}
                      onCheckedChange={(checked) => onRowChange(index, { selected: checked })}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-3 pl-0">{row.date}</TableCell>
                  <TableCell className="py-2 pr-3 pl-0 whitespace-normal">
                    {row.payee || row.description || "—"}
                  </TableCell>
                  <TableCell
                    className={`py-2 pr-3 pl-0 text-right tabular-nums ${row.type === "income" ? "text-secondary" : ""}`}
                  >
                    {row.type === "income" ? "+" : "−"}
                    {row.amount}
                  </TableCell>
                  <TableCell className="py-2 pr-3 pl-0">
                    <SelectField
                      aria-label={t("transactions.category")}
                      disabled={!!row.transferAccountId}
                      value={row.categoryId}
                      onChange={(categoryId) => onRowChange(index, { categoryId })}
                      options={[
                        { value: "", label: t("transactions.uncategorized") },
                        ...rowCategories.map((category) => ({
                          value: category.id!,
                          label: category.name,
                        })),
                      ]}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-3 pl-0">
                    <ImportTransferPicker
                      row={row}
                      accounts={accounts}
                      accountId={accountId}
                      onChange={(patch) => onRowChange(index, patch)}
                    />
                  </TableCell>
                  <TableCell className="py-2 pr-3 pl-0">
                    <div className="flex gap-1">
                      {row.isDuplicate ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {t("imports.duplicate")}
                        </span>
                      ) : null}
                      {row.looksLikeTransfer ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                          {t("imports.looksLikeTransfer")}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button
        pending={confirmPending}
        disabled={!rows.some((row) => row.selected)}
        onClick={onConfirm}
      >
        {t("imports.confirm")}
      </Button>
    </>
  );
}
