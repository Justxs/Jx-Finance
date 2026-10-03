import { FileUp, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { TextLink } from "@/components/ui/text-link/text-link";
import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";
import { ActiveFilters } from "@/features/transactions/active-filters/active-filters";
import { SelectionToolbar } from "@/features/transactions/selection-toolbar/selection-toolbar";
import { TransactionsFiltersDialog } from "@/features/transactions/transactions-filters-dialog/transactions-filters-dialog";
import { TransactionsList } from "@/features/transactions/transactions-list/transactions-list";
import { TransactionsTable } from "@/features/transactions/transactions-table/transactions-table";
import { TransactionsToolbar } from "@/features/transactions/transactions-toolbar/transactions-toolbar";
import { TransactionsTotals } from "@/features/transactions/transactions-totals/transactions-totals";
import { cn } from "@/lib/utils";
import { useTransactionsPageModel } from "./use-transactions-page-model";

export function TransactionsPage() {
  const { t } = useTranslation();
  const {
    features,
    accounts,
    categories,
    tags,
    filters,
    filterParams,
    exportCsvUrl,
    exportPdfUrl,
    stale,
    selection,
    selectableIds,
    selectedItems,
    selectedIds,
    mutations,
    groups,
    formSection,
    rowDialogs,
    remove,
    columnHeaders,
    columns,
    rowHandlers,
    rowLabel,
    paging,
    bulkDelete,
    importDialog,
  } = useTransactionsPageModel();
  const selecting = selectedItems.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t("transactions.title")}>
        <TransactionsToolbar
          filters={filters}
          filterParams={filterParams}
          accounts={accounts}
          categories={categories}
          tags={tags}
          onUseTemplate={formSection.startFromDraft}
          exportUrl={exportCsvUrl}
          exportPdfUrl={exportPdfUrl}
        />
        {features.import ? (
          <Button
            variant="outline"
            onClick={() => importDialog.setOpen(true)}
            disabled={accounts.length === 0}
          >
            <FileUp />
            {t("imports.open")}
          </Button>
        ) : null}
        <Button onClick={formSection.startBlank} disabled={accounts.length === 0}>
          <Plus />
          {t("transactions.add")}
        </Button>
      </PageHeader>

      {accounts.length === 0 ? (
        <EmptyText
          size="sm"
          action={
            <TextLink to="/accounts" search={{ new: "account" }}>
              {t("accounts.add")}
            </TextLink>
          }
        >
          {t("transactions.needAccount")}
        </EmptyText>
      ) : null}

      <Section className="space-y-2">
        <ActiveFilters filters={filters} tags={tags} />
        <div data-slot="ledger-tools" className="grid items-start">
          <div
            className={cn(
              "col-start-1 row-start-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1",
              selecting && "md:invisible",
            )}
          >
            <TransactionsTotals params={filterParams} stale={stale} />
            <TransactionsFiltersDialog filters={filters} tags={tags} className="md:hidden" />
          </div>
          <SelectionToolbar
            key={selecting ? "selecting" : "idle"}
            className="col-start-1 row-start-1"
            selected={selectedItems}
            categories={categories}
            tags={tags}
            accounts={accounts}
            pending={mutations.bulkCategory.isPending}
            tagPending={mutations.bulkTag.isPending}
            movePending={mutations.bulkMove.isPending}
            deletePending={mutations.bulkDelete.isPending}
            onApply={(categoryId) =>
              mutations.bulkCategory.mutate({ data: { transactionIds: selectedIds, categoryId } })
            }
            onApplyTags={(tagIds) =>
              mutations.bulkTag.mutate({ data: { transactionIds: selectedIds, tagIds } })
            }
            onMove={(accountId) =>
              mutations.bulkMove.mutate({ data: { transactionIds: selectedIds, accountId } })
            }
            onDelete={() => bulkDelete.setIds(selectedIds)}
            onGroup={() =>
              groups.openGroupDialog({ kind: "selection", transactionIds: selectedIds })
            }
            onClear={selection.clear}
          />
        </div>

        <div className="hidden md:block">
          <TransactionsTable
            rows={groups.rows}
            groups={groups.handlers}
            columns={columns}
            isPlaceholder={stale}
            columnFilters={columnHeaders.byColumn}
            columnAriaSort={columnHeaders.ariaSortByColumn}
            filtered={columnHeaders.active}
            onClearFilters={columnHeaders.clearAll}
            selection={{
              selectedIds: selection.selectedIds,
              selectableIds,
              rowLabel,
              onToggle: (id, selected, extend) =>
                selection.toggle(selectableIds, id, selected, extend),
              onTogglePage: (selected) => selection.togglePage(selectableIds, selected),
            }}
          />
        </div>
        <div className="md:hidden">
          <TransactionsList
            rows={groups.rows}
            groups={groups.handlers}
            isPlaceholder={stale}
            filtered={columnHeaders.active}
            onClearFilters={columnHeaders.clearAll}
            {...rowHandlers}
          />
        </div>

        <Pagination
          page={paging.page}
          pages={paging.pages}
          range={{ total: paging.total, pageSize: paging.pageSize }}
          onPageChange={paging.goToPage}
        />
      </Section>

      {formSection.dialogs}
      {rowDialogs.dialogs}
      {groups.dialogs}
      <ConfirmDeleteDialog {...remove.dialogProps} />
      <ConfirmDeleteDialog
        target={bulkDelete.ids}
        title={t("transactions.bulkDeleteTitle", { count: bulkDelete.count ?? 0 })}
        description={t("confirmDelete.undoable")}
        onCancel={() => bulkDelete.setIds(null)}
        onConfirm={(transactionIds) => mutations.bulkDelete.mutate({ data: { transactionIds } })}
      />
      {features.import ? (
        <ImportDialog
          open={importDialog.open}
          onOpenChange={importDialog.setOpen}
          accounts={accounts}
        />
      ) : null}
    </div>
  );
}
