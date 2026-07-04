import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionForm, type TransactionFormValues } from "./transaction-form";
import { useTransactionColumns } from "./use-transaction-columns";

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { page } = useSearch({ from: "/transactions" });
  const navigate = useNavigate({ from: "/transactions" });
  const [editing, setEditing] = useState<TransactionResponse | null>(null);

  function goToPage(nextPage: number) {
    navigate({ search: (prev) => ({ ...prev, page: nextPage }) });
  }

  const listParams = { page, pageSize: PAGE_SIZE };
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
            amount: data.amount,
            date: data.date,
            description: data.description,
            source: "manual",
            isSplit: false,
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

  const table = useReactTable({
    data: transactions.data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const total = transactions.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];

  function handleCreate(values: TransactionFormValues) {
    createMutation.mutate({ data: values });
  }

  function handleUpdate(values: TransactionFormValues) {
    updateMutation.mutate({ id: editing!.id!, data: values });
  }

  let formContent: ReactNode;
  if (accounts.isPending || categories.isPending) {
    formContent = (
      <div className="grid gap-4 md:grid-cols-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  } else if (accountList.length === 0) {
    formContent = <p className="text-sm text-muted-foreground">{t("transactions.needAccount")}</p>;
  } else if (editing) {
    formContent = (
      <TransactionForm
        key={editing.id}
        accounts={accountList}
        categories={categoryList}
        initial={editing}
        pending={updateMutation.isPending}
        onSubmit={handleUpdate}
        onCancel={() => setEditing(null)}
      />
    );
  } else {
    formContent = (
      <TransactionForm
        accounts={accountList}
        categories={categoryList}
        pending={false}
        onSubmit={handleCreate}
      />
    );
  }

  let tableBody: ReactNode;
  if (transactions.isPending) {
    tableBody = Array.from({ length: 5 }, (_, index) => (
      <tr key={index} className="border-b last:border-0">
        <td colSpan={columns.length} className="px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </td>
      </tr>
    ));
  } else if (table.getRowModel().rows.length === 0) {
    tableBody = (
      <tr>
        <td colSpan={columns.length} className="px-6 py-10 text-center text-muted-foreground">
          {t("transactions.empty")}
        </td>
      </tr>
    );
  } else {
    tableBody = table.getRowModel().rows.map((row) => (
      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-6 py-3">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("transactions.title")} subtitle={t("transactions.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">
          {editing ? t("transactions.editTitle") : t("transactions.add")}
        </h2>
        {formContent}
      </section>

      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50 text-left">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground ${
                      header.column.id === "amount" ? "text-right" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>{tableBody}</tbody>
        </table>

        <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
          <span className="text-muted-foreground">
            {t("transactions.pageInfo", { page, pages: pageCount })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              {t("actions.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => goToPage(page + 1)}
            >
              {t("actions.next")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
