import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, ImportPreviewRow } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

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
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium tracking-wide text-muted-foreground">
              <th className="py-2 pr-3" />
              <th className="py-2 pr-3">{t("transactions.date")}</th>
              <th className="py-2 pr-3">{t("transactions.description")}</th>
              <th className="py-2 pr-3 text-right">{t("transactions.amount")}</th>
              <th className="py-2 pr-3">{t("transactions.category")}</th>
              <th className="py-2 pr-3">{t("imports.recordAs")}</th>
              <th className="py-2 pr-3">{t("imports.flags")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowCategories = categories.filter((c) => c.type === row.type);
              return (
                <tr key={`${row.importRef}-${index}`} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <input
                      aria-label={t("imports.selectRow", { row: index + 1 })}
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      checked={row.selected}
                      onChange={(e) => onRowChange(index, { selected: e.target.checked })}
                    />
                  </td>
                  <td className="py-2 pr-3">{row.date}</td>
                  <td className="py-2 pr-3">{row.payee || row.description || "—"}</td>
                  <td
                    className={`py-2 pr-3 text-right tabular-nums ${row.type === "income" ? "text-secondary" : ""}`}
                  >
                    {row.type === "income" ? "+" : "−"}
                    {row.amount}
                  </td>
                  <td className="py-2 pr-3">
                    <Select
                      aria-label={t("transactions.category")}
                      disabled={!!row.transferAccountId}
                      value={row.categoryId}
                      onChange={(e) => onRowChange(index, { categoryId: e.target.value })}
                    >
                      <option value="">{t("transactions.uncategorized")}</option>
                      {rowCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-2 pr-3">
                    <ImportTransferPicker
                      row={row}
                      accounts={accounts}
                      accountId={accountId}
                      onChange={(patch) => onRowChange(index, patch)}
                    />
                  </td>
                  <td className="py-2 pr-3">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
