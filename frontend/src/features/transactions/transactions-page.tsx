import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { normalizeMoney } from "@/lib/validation";
import { Plus } from "lucide-react";
import {
  getGetAccountsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  useCreateTransactionEndpoint,
  useDeleteTransactionEndpoint,
  useGetAccountsEndpoint,
  useGetCategoriesEndpoint,
  useGetTransactionsEndpoint,
  useUpdateTransactionEndpoint,
} from "@/api/generated";
import type {
  PagedResponseOfTransactionResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { TransactionFormSection } from "./transaction-form-section";
import type { TransactionFormValues } from "./transaction-form";
import { TransactionsTable } from "./transactions-table";
import { TransactionsToolbar } from "./transactions-toolbar";
import { useTransactionColumns } from "./use-transaction-columns";

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

  const {
    page,
    search: searchText,
    accountId,
    categoryId,
    type,
    dateFrom,
    dateTo,
  } = useSearch({
    from: "/transactions",
  });
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
  };
  const listKey = getGetTransactionsEndpointQueryKey(listParams);

  const accounts = useGetAccountsEndpoint();
  const categories = useGetCategoriesEndpoint();
  const transactions = useGetTransactionsEndpoint(listParams);

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
                amount: line.amount,
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

  const deleteMutation = useDeleteTransactionEndpoint({
    mutation: { onSettled: invalidateLedger },
  });

  const accountNames = new Map(accounts.data?.map((a) => [a.id, a.name]) ?? []);
  const categoryById = new Map(categories.data?.map((c) => [c.id, c]) ?? []);

  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    onEdit: setEditing,
    onDelete: (id) => deleteMutation.mutate({ id }),
    deletePending: deleteMutation.isPending,
  });

  const total = transactions.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];

  function handleCreate(values: TransactionFormValues) {
    createMutation.mutate({ data: values });
  }

  function handleUpdate(values: TransactionFormValues) {
    if (!editing?.id) return;
    updateMutation.mutate({ id: editing.id, data: values });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")} subtitle={t("transactions.subtitle")}>
        <Button
          onClick={() => setCreateOpen(true)}
          disabled={accounts.isPending || categories.isPending || accountList.length === 0}
        >
          <Plus />
          {t("transactions.add")}
        </Button>
      </PageHeader>

      {accountList.length === 0 && !accounts.isPending ? (
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
        accounts={accountList}
        categories={categoryList}
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
        isPending={transactions.isPending}
        page={page}
        pageCount={pageCount}
        onPageChange={(nextPage) => navigate({ search: (prev) => ({ ...prev, page: nextPage }) })}
      />
    </div>
  );
}
