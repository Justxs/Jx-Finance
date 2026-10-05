import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  ImportConfirmGroup,
  TagResponse,
  TransactionGroupResponse,
} from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { FormActions } from "@/components/form/form-actions/form-actions";
import { Pagination } from "@/components/pagination/pagination";
import { amountColumnWide } from "@/components/transaction-amount/transaction-amount";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { Rows } from "@/components/ui/rows/rows";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table/table";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney } from "@/hooks/use-formatters";
import { usePageClamp } from "@/hooks/use-paged-list";
import { ImportRow, importAmount } from "./import-row";
import {
  ImportSummaryBar,
  NO_GROUP,
  importGroupPayload,
  importGroupReady,
} from "./import-summary-bar";
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
  groups: TransactionGroupResponse[];
  onRowChange: (index: number, patch: Partial<PreviewRowState>) => void;
  onRowsChange: (rows: PreviewRowState[]) => void;
  onConfirm: (group: ImportConfirmGroup | null) => void;
  onCancel: () => void;
  confirmPending: boolean;
  confirmError?: unknown;
}

export function ImportPreviewTable({
  rows,
  accounts,
  accountId,
  categories,
  tags,
  groups,
  onRowChange,
  onRowsChange,
  onConfirm,
  onCancel,
  confirmPending,
  confirmError,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const searchId = useId();
  const money = useMoney();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<PreviewView>("all");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(NO_GROUP);
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
  const wideAmounts = amountColumnWide(pageRows.map(({ row }) => importAmount(money, row)));

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
        groups={groups}
        group={group}
        disabled={confirmPending}
        onApplyCategory={(category) => onRowsChange(applyCategory(rows, category))}
        onGroupChange={setGroup}
      />
      {summary.selectableCount === 0 ? (
        <p className="text-sm text-foreground">{t("imports.allDuplicates")}</p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <SegmentedControl
          aria-label={t("imports.views.label")}
          value={view}
          onChange={showView}
          options={previewViews.map((item) => ({
            value: item,
            label: (
              <>
                {t(`imports.views.${item}`)}
                <span className="text-xs text-muted-foreground tabular-nums">
                  <span className="sr-only">, </span>
                  {counts[item]}
                </span>
              </>
            ),
          }))}
        />
        <FieldShell id={searchId} label={t("imports.views.search")} className="w-full sm:w-64">
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => search(event.target.value)}
          />
        </FieldShell>
      </div>

      {visible.length === 0 ? (
        <EmptyText>{t("imports.views.empty")}</EmptyText>
      ) : (
        <>
          <div className="md:hidden">
            <label className="flex items-center gap-3 border-b border-rule py-2 text-xs font-medium text-muted-foreground">
              {selectAll}
              {t("imports.selectAll")}
            </label>
            <Rows aria-label={t("imports.preview")}>
              {pageRows.map(({ row, index }) => (
                <ImportRow
                  key={`${row.importRef}-${index}`}
                  variant="list"
                  {...rowProps(row, index)}
                />
              ))}
            </Rows>
          </div>

          <div className="hidden md:block">
            <Table
              label={t("imports.preview")}
              columns={["w-10", "w-27", undefined, wideAmounts ? "w-38" : "w-30", "w-48", "w-12"]}
              className={wideAmounts ? "min-w-208" : "min-w-200"}
            >
              <TableHeader>
                <TableRow>
                  <TableHead>{selectAll}</TableHead>
                  <TableHead>{t("transactions.date")}</TableHead>
                  <TableHead>{t("transactions.description")}</TableHead>
                  <TableHead numeric>{t("transactions.amount")}</TableHead>
                  <TableHead>{t("transactions.category")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("imports.more")}</span>
                  </TableHead>
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
          </div>
        </>
      )}

      <Pagination
        page={page}
        pages={pages}
        range={{ total: visible.length, pageSize: PREVIEW_PAGE_SIZE }}
        onPageChange={setPage}
      />

      <FormError error={confirmError} />

      <FormActions cancelDisabled={confirmPending} onCancel={onCancel}>
        <Button
          pending={confirmPending}
          disabled={summary.selected === 0 || !importGroupReady(group)}
          onClick={() => onConfirm(importGroupPayload(group))}
        >
          {t("imports.confirmCount", { count: summary.selected })}
        </Button>
      </FormActions>
    </>
  );
}
