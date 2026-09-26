import { useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getTransactionsQueryKey,
  useAccountsSuspense,
  useCategoriesSuspense,
  useTagsSuspense,
  useTransactionsSuspense,
} from "@/api/generated";
import type { TransactionResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { TRANSACTIONS_EXPORT_CSV_PATH, TRANSACTIONS_EXPORT_PDF_PATH } from "@/lib/export-url";
import { byId, nameById } from "@/lib/options";
import { saveTransactionTemplate } from "@/stores/transaction-views";
import { SelectionToolbar } from "../selection-toolbar/selection-toolbar";
import { transactionName } from "../transaction-amount";
import {
  type TransactionDraft,
  type TransactionFormValues,
  duplicateDraft,
  templateValuesFromFormValues,
} from "../transaction-form";
import { TransactionFormSection } from "../transaction-form-section/transaction-form-section";
import { transactionFilterParams, transactionListParams } from "../transaction-queries";
import { TransactionsFiltersDialog } from "../transactions-filters-dialog/transactions-filters-dialog";
import { TransactionsList } from "../transactions-list/transactions-list";
import {
  TransactionsTable,
  isSelectableTransaction,
  useTransactionColumns,
  useTransactionColumnHeaders,
} from "../transactions-table";
import { TransactionsToolbar } from "../transactions-toolbar/transactions-toolbar";
import { TransactionsTotals } from "../transactions-totals/transactions-totals";
import { useTransactionMutations } from "./use-transaction-mutations";
import { useTransactionSelection } from "./use-transaction-selection";

export function TransactionsPage() {
  const { t } = useTranslation();
  const { defaultPageSize: pageSize } = useSettingsSuspense();
  const money = useMoney();
  const formatDate = useIsoDate();

  const { new: createOpen = false, ...view } = useSearch({ from: "/transactions" });
  const viewKey = JSON.stringify(view);
  const [shown, stale] = useDeferredParams(view);

  const { page } = shown;
  const navigate = useNavigate({ from: "/transactions" });
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [prefill, setPrefill] = useState<{ key: string; draft: TransactionDraft } | null>(null);
  const selection = useTransactionSelection(viewKey);

  function setCreateOpen(open: boolean) {
    createMutation.reset();
    if (!open) {
      setPrefill(null);
    }
    void navigate({
      search: (prev) => ({ ...prev, new: open ? true : undefined }),
      replace: !open,
    });
  }

  function startFromDraft(draft: TransactionDraft) {
    setPrefill({ key: crypto.randomUUID(), draft });
    setCreateOpen(true);
  }

  function startBlank() {
    setPrefill(null);
    setCreateOpen(true);
  }

  function startEditing(transaction: TransactionResponse) {
    updateMutation.reset();
    setEditing(transaction);
  }

  const listParams = transactionListParams(shown, pageSize);
  const listKey = getTransactionsQueryKey(listParams);
  const filterParams = transactionFilterParams(shown);
  const exportCsvUrl = useExportUrl(TRANSACTIONS_EXPORT_CSV_PATH, filterParams);
  const exportPdfUrl = useExportUrl(TRANSACTIONS_EXPORT_PDF_PATH, filterParams);

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const tags = useTagsSuspense();
  const transactions = useTransactionsSuspense(listParams);

  const {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    bulkTag: bulkTagMutation,
    bulkCategory: bulkCategoryMutation,
  } = useTransactionMutations({
    listKey,
    onUpdated: () => setEditing(null),
    onBulkApplied: selection.clear,
  });

  const accountList = accounts.data;
  const categoryList = categories.data;
  const accountNames = nameById(accountList);
  const categoryById = byId(categoryList);
  const tagList = tags.data;
  const tagById = byId(tagList);

  const items = transactions.data.items;
  const selectableIds = items.filter(isSelectableTransaction).map((item) => item.id);
  const selectedItems = items.filter((item) => selection.selectedIds.has(item.id));
  const remove = useConfirmedDelete(
    deleteMutation,
    items,
    (item) =>
      `${formatDate(item.date)} · ${transactionName(item, categoryById, t)} · ${money.formatSigned(
        Number(item.amount),
        item.type === "income" ? "+" : "−",
        item.currency,
      )}`,
    "transaction",
  );
  const deletingId = remove.pendingId;

  const columnHeaders = useTransactionColumnHeaders({
    accounts: accountList,
    categories: categoryList,
    tags: tagList,
  });

  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    tagById,
    onEdit: startEditing,
    onDuplicate: (transaction) => startFromDraft(duplicateDraft(transaction)),
    onDelete: remove.request,
    deletingId,
  });

  const total = transactions.data.total;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function handleCreate(values: TransactionFormValues) {
    return createMutation.mutateAsync({ data: values }, { onSuccess: () => setCreateOpen(false) });
  }

  async function handleCreateAnother(values: TransactionFormValues) {
    await createMutation.mutateAsync({ data: values });
    return true;
  }

  function handleSaveAsTemplate(name: string, values: TransactionFormValues) {
    saveTransactionTemplate(name, templateValuesFromFormValues(values));
    toast.success(t("transactions.templateSaved"));
  }

  async function handleUpdate(values: TransactionFormValues) {
    if (!editing) {
      return;
    }
    await updateMutation.mutateAsync({ id: editing.id, data: values });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")}>
        <TransactionsToolbar
          accounts={accountList}
          categories={categoryList}
          tags={tagList}
          filtered={columnHeaders.active}
          onClearFilters={columnHeaders.clearAll}
          onUseTemplate={startFromDraft}
          exportUrl={exportCsvUrl}
          exportPdfUrl={exportPdfUrl}
        />
        <Button onClick={startBlank} disabled={accountList.length === 0}>
          <Plus />
          {t("transactions.add")}
        </Button>
      </PageHeader>

      {accountList.length === 0 ? (
        <EmptyText size="sm">{t("transactions.needAccount")}</EmptyText>
      ) : null}

      <TransactionFormSection
        accounts={accountList}
        categories={categoryList}
        tags={tagList}
        createOpen={createOpen && accountList.length > 0}
        onCreateOpenChange={setCreateOpen}
        prefill={prefill ?? undefined}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        updatePending={updateMutation.isPending}
        createPending={createMutation.isPending}
        createError={createMutation.error}
        updateError={updateMutation.error}
        onCreate={handleCreate}
        onCreateAnother={handleCreateAnother}
        onSaveAsTemplate={handleSaveAsTemplate}
        onUpdate={handleUpdate}
      />

      <Section className="space-y-2">
        {selectedItems.length > 0 ? (
          <SelectionToolbar
            selected={selectedItems}
            categories={categoryList}
            tags={tagList}
            pending={bulkCategoryMutation.isPending}
            tagPending={bulkTagMutation.isPending}
            onApply={(nextCategoryId) =>
              bulkCategoryMutation.mutate({
                data: {
                  transactionIds: selectedItems.map((item) => item.id),
                  categoryId: nextCategoryId,
                },
              })
            }
            onApplyTags={(nextTagIds) =>
              bulkTagMutation.mutate({
                data: {
                  transactionIds: selectedItems.map((item) => item.id),
                  tagIds: nextTagIds,
                },
              })
            }
            onClear={selection.clear}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <TransactionsTotals params={filterParams} stale={stale} />
            <TransactionsFiltersDialog
              accounts={accountList}
              categories={categoryList}
              tags={tagList}
              className="md:hidden"
            />
          </div>
        )}

        <div className="hidden md:block">
          <TransactionsTable
            data={items}
            columns={columns}
            isPlaceholder={stale}
            columnFilters={columnHeaders.byColumn}
            columnAriaSort={columnHeaders.ariaSortByColumn}
            filtered={columnHeaders.active}
            selection={{
              selectedIds: selection.selectedIds,
              selectableIds,
              rowLabel: (row) => `${formatDate(row.date)} ${transactionName(row, categoryById, t)}`,
              onToggle: selection.toggle,
              onTogglePage: (selected) => selection.togglePage(selectableIds, selected),
            }}
          />
        </div>
        <div className="md:hidden">
          <TransactionsList
            data={items}
            accountNames={accountNames}
            categoryById={categoryById}
            tagById={tagById}
            isPlaceholder={stale}
            filtered={columnHeaders.active}
            onEdit={startEditing}
            onDuplicate={(transaction) => startFromDraft(duplicateDraft(transaction))}
            onDelete={remove.request}
            deletingId={deletingId}
          />
        </div>

        <Pagination
          page={page}
          pages={pageCount}
          onPageChange={(nextPage) => navigate({ search: (prev) => ({ ...prev, page: nextPage }) })}
        />
      </Section>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
