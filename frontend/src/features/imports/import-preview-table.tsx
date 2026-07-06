import { useTranslation } from "react-i18next";
import type { CategoryResponse, ImportPreviewRow } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export interface PreviewRowState extends ImportPreviewRow {
  selected: boolean;
  categoryId: string;
}

interface Props {
  rows: PreviewRowState[];
  categories: CategoryResponse[];
  onRowChange: (index: number, patch: Partial<PreviewRowState>) => void;
  onConfirm: () => void;
  confirmPending: boolean;
}

export function ImportPreviewTable({
  rows,
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-3" />
              <th className="py-2 pr-3">{t("transactions.date")}</th>
              <th className="py-2 pr-3">{t("transactions.description")}</th>
              <th className="py-2 pr-3 text-right">{t("transactions.amount")}</th>
              <th className="py-2 pr-3">{t("transactions.category")}</th>
              <th className="py-2 pr-3">{t("imports.flags")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rowCategories = categories.filter((c) => c.type === row.type);
              return (
                <tr key={row.importRef} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <input
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
      <Button disabled={confirmPending} onClick={onConfirm}>
        {t("imports.confirm")}
      </Button>
    </>
  );
}
