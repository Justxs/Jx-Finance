import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { normalizeMoney } from "@/lib/validation";
import { Plus } from "lucide-react";
import {
  getGetAccountsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
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
import { PageHeader } from "@/components/page-header";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { TransactionFormSection } from "./transaction-form-section";
import type { TransactionFormValues } from "./transaction-form";
import { TransactionsTable } from "./transactions-table";
import { TransactionsToolbar } from "./transactions-toolbar";
import { useTransactionColumns } from "./use-transaction-columns";
import { useTransactionColumnHeaders } from "./use-transaction-column-headers";

const PAGE_SIZE = 20;

function buildExportUrl(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, String(value));
  }
  return `${path}?${search.toString()}`;
}

export function TransactionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [shown, stale] = useDeferredParams(useSearch({ from: "/transactions" }));

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
  const [createOpen, setCreateOpen] = useState(false);

  const listParams = {
    page,
    pageSize: PAGE_SIZE,
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

  const accounts = useGetAccountsEndpointSuspense();
  const categories = useGetCategoriesEndpointSuspense();
  const transactions = useGetTransactionsEndpointSuspense(listParams);

  function invalidateLedger() {
    queryClient.invalidateQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
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
            id: `optimistic-${crypto.randomUUID()}`,
            accountId: data.accountId,
            categoryId: data.categoryId,
            type: data.type,
            amount: normalizeMoney(data.amount ?? ""),
            date: data.date,
            description: data.description,
            source: "manual",
            isSplit: (data.lines?.length ?? 0) > 0,
            lines:
              data.lines?.map((line, index) => ({
                id: `optimistic-line-${index}`,
                categoryId: line.categoryId,
                amount: normalizeMoney(line.amount ?? ""),
                description: line.description,
              })) ?? null,
            createdAt: new Date().toISOString(),
          };
          queryClient.setQueryData<PagedResponseOfTransactionResponse>(listKey, {
            ...previous,
            items: [optimistic, ...(previous.items ?? [])],
            total: (previous.total ?? 0) + 1,
          });
        }
        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(listKey, context.previous);
        }
      },
      onSuccess: () => setCreateOpen(false),
      onSettled: invalidateLedger,
    },
  });

  const updateMutation = useUpdateTransactionEndpoint({
    mutation: {
      onSuccess: () => setEditing(null),
      onSettled: invalidateLedger,
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransactionEndpoint({
    mutation: { onSettled: invalidateLedger },
  });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const accountNames = new Map(accountList.map((a) => [a.id, a.name]));
  const categoryById = new Map(categoryList.map((c) => [c.id, c]));

  const columnHeaders = useTransactionColumnHeaders({
    accounts: accountList,
    categories: categoryList,
  });

  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    onEdit: setEditing,
    onDelete: (id) => setDeleteTarget(id),
    deletingId: deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null,
  });

  const total = transactions.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleCreate(values: TransactionFormValues) {
    createMutation.mutate({ data: values });
  }

  function handleUpdate(values: TransactionFormValues) {
    if (!editing?.id) return;
    updateMutation.mutate({ id: editing.id, data: values });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")}>
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
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        updatePending={updateMutation.isPending}
        createPending={createMutation.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <TransactionsToolbar
        filtered={columnHeaders.active}
        onClearFilters={columnHeaders.clearAll}
        exportUrl={buildExportUrl("/api/transactions/export", {
          search: searchText,
          accountId,
          categoryId,
          type,
          dateFrom,
          dateTo,
        })}
        exportPdfUrl={buildExportUrl("/api/transactions/export/pdf", {
          search: searchText,
          accountId,
          categoryId,
          type,
          dateFrom,
          dateTo,
        })}
      />

      <TransactionsTable
        data={transactions.data?.items ?? []}
        columns={columns}
        isPlaceholder={stale}
        columnFilters={columnHeaders.byColumn}
        filtered={columnHeaders.active}
        page={page}
        pageCount={pageCount}
        onPageChange={(nextPage) => navigate({ search: (prev) => ({ ...prev, page: nextPage }) })}
      />
      <ConfirmDeleteDialog
        target={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
