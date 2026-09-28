import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { Rows } from "@/components/ui/rows/rows";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
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
  type PreviewView,
  previewViews,
  selectAllPatch,
  summarizeSelection,
  viewCounts,
  visibleRowIndexes,
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
  const [view, setView] = useState<PreviewView>("all");
  const [query, setQuery] = useState("");
  const visible = visibleRowIndexes(rows, view, query);
  const pages = usePageClamp({ page, setPage }, visible.length, PREVIEW_PAGE_SIZE);

  if (rows.length === 0) {
    return <EmptyText>{t("imports.noRows")}</EmptyText>;
  }

  const summary = summarizeSelection(rows);
  const visibleSummary = summarizeSelection(visible.flatMap((index) => rows[index] ?? []));
  const counts = viewCounts(rows);
  const offset = (page - 1) * PREVIEW_PAGE_SIZE;
  const pageRows = visible
    .slice(offset, offset + PREVIEW_PAGE_SIZE)
    .flatMap((index) => (rows[index] ? [{ row: rows[index], index }] : []));

  function rowProps(row: PreviewRowState, index: number) {
    return { row, index, accountId, accounts, categories, tags, onRowChange };
  }

  function showView(next: PreviewView) {
    setView(next);
    setPage(1);
  }

  function search(next: string) {
    setQuery(next);
    setPage(1);
  }

  const selectAll = (
    <Tooltip content={t("imports.selectAllHint")}>
      <Checkbox
        aria-label={t("imports.selectAll")}
        checked={visibleSummary.allSelected}
        indeterminate={visibleSummary.someSelected && !visibleSummary.allSelected}
        disabled={visibleSummary.selectableCount === 0}
        onCheckedChange={(checked) => onRowsChange(selectAllPatch(rows, checked, new Set(visible)))}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          aria-label={t("imports.views.label")}
          value={view}
          onChange={showView}
          options={previewViews.map((item) => ({
            value: item,
            label: (
              <>
                {t(`imports.views.${item}`)}
                <span className="text-xs text-muted-foreground tabular-nums">{counts[item]}</span>
              </>
            ),
          }))}
        />
        <Input
          type="search"
          aria-label={t("imports.views.search")}
          placeholder={t("imports.views.search")}
          value={query}
          onChange={(event) => search(event.target.value)}
          className="sm:w-64"
        />
      </div>

      {visible.length === 0 ? <EmptyText>{t("imports.views.empty")}</EmptyText> : null}

      <div className="md:hidden">
        <label className="flex items-center gap-3 border-b border-rule py-2 text-xs font-medium text-muted-foreground">
          {selectAll}
          {t("imports.selectAll")}
        </label>
        <Rows aria-label={t("imports.preview")}>
          {pageRows.map(({ row, index }) => (
            <ImportRow key={`${row.importRef}-${index}`} variant="list" {...rowProps(row, index)} />
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
              {pageRows.map(({ row, index }) => (
                <ImportRow
                  key={`${row.importRef}-${index}`}
                  variant="table"
                  {...rowProps(row, index)}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollRegion>
      </div>

      <Pagination
        page={page}
        pages={pages}
        range={{ total: visible.length, pageSize: PREVIEW_PAGE_SIZE }}
        onPageChange={setPage}
      />

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
