import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetAccountsEndpointQueryKey,
  getGetBudgetsEndpointQueryKey,
  getGetCategoryBreakdownEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  getGetReportSummaryEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  getGetTransactionsSummaryEndpointQueryKey,
  useBulkCategorizeTransactionsEndpoint,
  useCreateTransactionEndpoint,
  useDeleteTransactionEndpoint,
  useGetAccountsEndpointSuspense,
  useGetCategoriesEndpointSuspense,
  useGetTransactionsEndpointSuspense,
  useUpdateTransactionEndpoint,
} from "@/api/generated";
import type {
  PagedResponseOfTransactionResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useIsoDate, useMoney, useReportingCurrency } from "@/hooks/use-formatters";
import { useSettingsSuspense } from "@/hooks/use-settings";
import { normalizeMoney } from "@/lib/validation";
import { SelectionToolbar } from "../selection-toolbar";
import { optimisticId, transactionName } from "../transaction-amount";
import type { TransactionFormValues } from "../transaction-form";
import { TransactionFormSection } from "../transaction-form-section";
import { TransactionsFiltersDialog } from "../transactions-filters-dialog";
import { TransactionsList } from "../transactions-list";
import {
  TransactionsTable,
  isSelectableTransaction,
  useTransactionColumns,
  useTransactionColumnHeaders,
} from "../transactions-table";
import { TransactionsToolbar } from "../transactions-toolbar";
import { TransactionsTotals } from "../transactions-totals";

const NO_SELECTION: ReadonlySet<string> = new Set();

interface SelectionState {
  viewKey: string;
  ids: ReadonlySet<string>;
}

function buildExportUrl(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, String(value));
    }
  }
  return `${path}?${search.toString()}`;
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const { defaultPageSize: pageSize, features } = useSettingsSuspense();
  const money = useMoney();
  const reportingCurrency = useReportingCurrency();
  const formatDate = useIsoDate();
  const queryClient = useQueryClient();

  const { new: createOpen = false, ...view } = useSearch({ from: "/transactions" });
  const viewKey = JSON.stringify(view);
  const [shown, stale] = useDeferredParams(view);

  const {
    page,
    search: searchText,
    accountId,
    categoryId,
    type,
    dateFrom,
    dateTo,
    sort,
    direction,
  } = shown;
  const navigate = useNavigate({ from: "/transactions" });
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>({ viewKey, ids: NO_SELECTION });
  const selectedIds = selection.viewKey === viewKey ? selection.ids : NO_SELECTION;

  function setCreateOpen(open: boolean) {
    navigate({
      search: (prev) => ({ ...prev, new: open ? true : undefined }),
      replace: !open,
    });
  }

  function setSelectedIds(ids: ReadonlySet<string>) {
    setSelection({ viewKey, ids });
  }

  const listParams = {
    page,
    pageSize,
    search: searchText,
    accountId,
    categoryId,
    type,
    dateFrom,
    dateTo,
    sort,
    direction,
  };
  const listKey = getGetTransactionsEndpointQueryKey(listParams);
  const filterParams = { search: searchText, accountId, categoryId, type, dateFrom, dateTo };

  const accounts = useGetAccountsEndpointSuspense();
  const categories = useGetCategoriesEndpointSuspense();
  const transactions = useGetTransactionsEndpointSuspense(listParams);

  function invalidateLedger() {
    queryClient.invalidateQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsSummaryEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAccountsEndpointQueryKey() });
  }

  const createMutation = useCreateTransactionEndpoint({
    mutation: {
      onMutate: async ({ data }) => {
        await queryClient.cancelQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
        const previous = queryClient.getQueryData<PagedResponseOfTransactionResponse>(listKey);
        if (previous) {
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
            createdAt: new Date().toISOString(),
          };
          queryClient.setQueryData<PagedResponseOfTransactionResponse>(listKey, {
            ...previous,
            items: [optimistic, ...previous.items],
            total: previous.total + 1,
          });
        }
        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listKey, context.previous);
        }
      },
      onSuccess: () => toast.success(t("transactions.created")),
      onSettled: invalidateLedger,
    },
  });

  const updateMutation = useUpdateTransactionEndpoint({
    mutation: {
      onSuccess: () => {
        toast.success(t("transactions.updated"));
        setEditing(null);
      },
      onSettled: invalidateLedger,
    },
  });

  const deleteMutation = useDeleteTransactionEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("transactions.deleted")),
      onSettled: invalidateLedger,
    },
  });

  const bulkCategoryMutation = useBulkCategorizeTransactionsEndpoint({
    mutation: {
      onSuccess: (result) => {
        toast.success(t("transactions.recategorized", { count: result.updated }));
        setSelectedIds(NO_SELECTION);
      },
      onSettled: () => {
        invalidateLedger();
        queryClient.invalidateQueries({ queryKey: getGetCategoryBreakdownEndpointQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReportSummaryEndpointQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBudgetsEndpointQueryKey() });
      },
    },
  });

  const accountList = accounts.data;
  const categoryList = categories.data;
  const accountNames = new Map(accountList.map((a) => [a.id, a.name]));
  const categoryById = new Map(categoryList.map((c) => [c.id, c]));

  const items = transactions.data.items;
  const selectableIds = items.filter(isSelectableTransaction).map((item) => item.id);
  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;

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
  });

  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    onEdit: setEditing,
    onDelete: setDeleteTarget,
    deletingId,
  });

  const deleteItem = items.find((item) => item.id === deleteTarget);
  const deleteLabel = deleteItem
    ? `${formatDate(deleteItem.date)} · ${transactionName(deleteItem, categoryById, t)} · ${money.formatSigned(
        Number(deleteItem.amount),
        deleteItem.type === "income" ? "+" : "−",
        deleteItem.currency,
      )}`
    : undefined;

  const total = transactions.data.total;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function handleCreate(values: TransactionFormValues) {
    createMutation.mutate({ data: values }, { onSuccess: () => setCreateOpen(false) });
  }

  async function handleCreateAnother(values: TransactionFormValues) {
    try {
      await createMutation.mutateAsync({ data: values });
      return true;
    } catch {
      return false;
    }
  }

  function handleUpdate(values: TransactionFormValues) {
    if (!editing) {
      return;
    }
    updateMutation.mutate({ id: editing.id, data: values });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")}>
        <TransactionsToolbar
          filtered={columnHeaders.active}
          onClearFilters={columnHeaders.clearAll}
          exportUrl={buildExportUrl("/api/transactions/export", filterParams)}
          exportPdfUrl={buildExportUrl("/api/transactions/export/pdf", filterParams)}
        />
        {features.import ? (
          <Link
            to="/import"
            search={{ accountId }}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <FileUp />
            {t("nav.import")}
          </Link>
        ) : null}
        <Button onClick={() => setCreateOpen(true)} disabled={accountList.length === 0}>
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
        createOpen={createOpen && accountList.length > 0}
        onCreateOpenChange={setCreateOpen}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        updatePending={updateMutation.isPending}
        createPending={createMutation.isPending}
        onCreate={handleCreate}
        onCreateAnother={handleCreateAnother}
        onUpdate={handleUpdate}
      />

      <section className="min-w-0 space-y-2">
        {selectedItems.length > 0 ? (
          <SelectionToolbar
            selected={selectedItems}
            categories={categoryList}
            pending={bulkCategoryMutation.isPending}
            onApply={(nextCategoryId) =>
              bulkCategoryMutation.mutate({
                data: {
                  transactionIds: selectedItems.map((item) => item.id),
                  categoryId: nextCategoryId,
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
            isPlaceholder={stale}
            filtered={columnHeaders.active}
            onEdit={setEditing}
            onDelete={setDeleteTarget}
            deletingId={deletingId}
          />
        </div>

        <Pagination
          page={page}
          pages={pageCount}
          onPageChange={(nextPage) => navigate({ search: (prev) => ({ ...prev, page: nextPage }) })}
        />
      </section>

      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={deleteLabel}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
