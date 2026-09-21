import { useNavigate, useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type CreateTransactionMutationVariables,
  getTransactionsQueryKey,
  useBulkCategorizeTransactions,
  useBulkTagTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useAccountsSuspense,
  useCategoriesSuspense,
  useTagsSuspense,
  useTransactionsSuspense,
  useUpdateTransaction,
} from "@/api/generated";
import type {
  PagedResponseOfTransactionResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { Pagination } from "@/components/pagination/pagination";
import { Button } from "@/components/ui/button/button";
import { Panel } from "@/components/ui/section/section";
import { tagMapOf } from "@/features/tags/tag-chips/tag-chips";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { useIsoDate, useMoney, useReportingCurrency } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { silent } from "@/lib/mutations";
import { optimisticPagedRemoval, optimisticUpdate } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { normalizeMoney } from "@/lib/validation";
import { saveTransactionTemplate } from "@/stores/transaction-views";
import { SelectionToolbar } from "../selection-toolbar/selection-toolbar";
import { optimisticId, transactionName } from "../transaction-amount";
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

const NO_SELECTION: ReadonlySet<string> = new Set();

interface SelectionState {
  viewKey: string;
  ids: ReadonlySet<string>;
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const { defaultPageSize: pageSize } = useSettingsSuspense();
  const money = useMoney();
  const reportingCurrency = useReportingCurrency();
  const formatDate = useIsoDate();

  const { new: createOpen = false, ...view } = useSearch({ from: "/transactions" });
  const viewKey = JSON.stringify(view);
  const [shown, stale] = useDeferredParams(view);

  const { page } = shown;
  const navigate = useNavigate({ from: "/transactions" });
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [prefill, setPrefill] = useState<{ key: string; draft: TransactionDraft } | null>(null);
  const [selection, setSelection] = useState<SelectionState>({ viewKey, ids: NO_SELECTION });
  const selectedIds = selection.viewKey === viewKey ? selection.ids : NO_SELECTION;

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

  function setSelectedIds(ids: ReadonlySet<string>) {
    setSelection({ viewKey, ids });
  }

  const listParams = transactionListParams(shown, pageSize);
  const listKey = getTransactionsQueryKey(listParams);
  const filterParams = transactionFilterParams(shown);
  const exportCsvUrl = useExportUrl("/api/transactions/export", filterParams);
  const exportPdfUrl = useExportUrl("/api/transactions/export/pdf", filterParams);

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const tags = useTagsSuspense();
  const transactions = useTransactionsSuspense(listParams);

  function optimisticTransaction({ data }: CreateTransactionMutationVariables) {
    const optimistic: TransactionResponse = {
      id: optimisticId(crypto.randomUUID()),
      accountId: data.accountId,
      categoryId: data.categoryId,
      type: data.type,
      amount: normalizeMoney(data.amount),
      currency: data.currency ?? reportingCurrency,
      reportingAmount: normalizeMoney(data.amount),
      date: data.date,
      description: data.description,
      source: "manual",
      isSplit: (data.lines?.length ?? 0) > 0,
      lines:
        data.lines?.map((line, index) => ({
          id: optimisticId(`line-${index}`),
          categoryId: line.categoryId,
          amount: normalizeMoney(line.amount),
          description: line.description,
        })) ?? null,
      tagIds: data.tagIds ?? [],
      createdAt: new Date().toISOString(),
      attachmentCount: 0,
    };
    return optimistic;
  }

  function withOptimisticTransaction(
    previous: PagedResponseOfTransactionResponse,
    variables: CreateTransactionMutationVariables,
  ) {
    return {
      ...previous,
      items: [optimisticTransaction(variables), ...previous.items],
      total: previous.total + 1,
    };
  }

  const optimisticCreate = optimisticUpdate({
    queryKey: listKey,
    cancelKey: getTransactionsQueryKey(),
    apply: withOptimisticTransaction,
  });

  const optimisticDelete = optimisticPagedRemoval<PagedResponseOfTransactionResponse>(
    listKey,
    getTransactionsQueryKey(),
  );

  const createMutation = useCreateTransaction({
    mutation: {
      meta: { silent: true },
      ...optimisticCreate,
      onSuccess: () => toast.success(t("transactions.created")),
    },
  });

  const updateMutation = useUpdateTransaction(
    silent({
      onSuccess: () => {
        toast.success(t("transactions.updated"));
        setEditing(null);
      },
    }),
  );

  const deleteMutation = useDeleteTransaction({ mutation: optimisticDelete });

  const bulkTagMutation = useBulkTagTransactions({
    mutation: {
      onSuccess: (result) => {
        toast.success(t("tags.retagged", { count: result.updated }));
        setSelectedIds(NO_SELECTION);
      },
    },
  });

  const bulkCategoryMutation = useBulkCategorizeTransactions({
    mutation: {
      onSuccess: (result) => {
        toast.success(t("transactions.recategorized", { count: result.updated }));
        setSelectedIds(NO_SELECTION);
      },
    },
  });

  const accountList = accounts.data;
  const categoryList = categories.data;
  const accountNames = nameById(accountList);
  const categoryById = new Map(categoryList.map((c) => [c.id, c]));
  const tagList = tags.data;
  const tagById = tagMapOf(tagList);

  const items = transactions.data.items;
  const selectableIds = items.filter(isSelectableTransaction).map((item) => item.id);
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
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
  const deletingId = remove.pendingId ?? null;

  function handleToggleRow(id: string, selected: boolean) {
    setSelection((previous) => {
      const next = new Set(previous.viewKey === viewKey ? previous.ids : NO_SELECTION);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { viewKey, ids: next };
    });
  }

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
        <p className="text-sm text-muted-foreground">{t("transactions.needAccount")}</p>
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

      <Panel as="section" className="space-y-2">
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
            onClear={() => setSelectedIds(NO_SELECTION)}
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
              selectedIds,
              selectableIds,
              rowLabel: (row) => `${formatDate(row.date)} ${transactionName(row, categoryById, t)}`,
              onToggle: handleToggleRow,
              onTogglePage: (selected) =>
                setSelectedIds(selected ? new Set(selectableIds) : NO_SELECTION),
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
      </Panel>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
