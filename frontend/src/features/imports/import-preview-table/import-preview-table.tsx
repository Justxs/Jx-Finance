import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  ScrollRegion,
} from "@/components/ui/table/table";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { usePageClamp } from "@/hooks/use-paged-list";
import { ImportRow } from "./import-row";
import { ImportSummaryBar } from "./import-summary-bar";
import {
  applyCategory,
  type PreviewRowState,
  selectAllPatch,
  summarizeSelection,
} from "./preview-rows";

const PREVIEW_PAGE_SIZE = 50;

interface Props {
  rows: PreviewRowState[];
  accountId: string;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
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
  tags,
  onRowChange,
  onRowsChange,
  onConfirm,
  onCancel,
  confirmPending,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const pages = usePageClamp({ page, setPage }, rows.length, PREVIEW_PAGE_SIZE);

  if (rows.length === 0) {
    return <EmptyText>{t("imports.noRows")}</EmptyText>;
  }

  const summary = summarizeSelection(rows);
  const offset = (page - 1) * PREVIEW_PAGE_SIZE;
  const pageRows = rows.slice(offset, offset + PREVIEW_PAGE_SIZE);

  function rowProps(row: PreviewRowState, index: number) {
    return { row, index: offset + index, accountId, accounts, categories, tags, onRowChange };
  }

  const selectAll = (
    <Tooltip content={t("imports.selectAllHint")}>
      <Checkbox
        aria-label={t("imports.selectAll")}
        checked={summary.allSelected}
        indeterminate={summary.someSelected && !summary.allSelected}
        disabled={summary.selectableCount === 0}
        onCheckedChange={(checked) => onRowsChange(selectAllPatch(rows, checked))}
      />
    </Tooltip>
  );

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

      <div className="md:hidden">
        <label className="flex items-center gap-3 border-b border-rule py-2 text-xs font-medium text-muted-foreground">
          {selectAll}
          {t("imports.selectAll")}
        </label>
        <Rows aria-label={t("imports.preview")}>
          {pageRows.map((row, index) => (
            <ImportRow
              key={`${row.importRef}-${offset + index}`}
              variant="list"
              {...rowProps(row, index)}
            />
          ))}
        </Rows>
      </div>

      <div className="-mx-3 hidden md:block">
        <ScrollRegion aria-label={t("imports.preview")}>
          <Table className="min-w-176">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{selectAll}</TableHead>
                <TableHead>{t("transactions.date")}</TableHead>
                <TableHead>{t("transactions.description")}</TableHead>
                <TableHead numeric>{t("transactions.amount")}</TableHead>
                <TableHead>{t("transactions.category")}</TableHead>
                <TableHead>{t("tags.field")}</TableHead>
                <TableHead>{t("imports.recordAs")}</TableHead>
                <TableHead>{t("imports.flags")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row, index) => (
                <ImportRow
                  key={`${row.importRef}-${offset + index}`}
                  variant="table"
                  {...rowProps(row, index)}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollRegion>
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />

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
