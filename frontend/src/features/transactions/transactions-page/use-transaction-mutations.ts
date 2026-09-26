import type { QueryKey } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type CreateTransactionMutationVariables,
  getTransactionsQueryKey,
  useBulkCategorizeTransactions,
  useBulkTagTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/api/generated";
import type {
  Currency,
  PagedResponseOfTransactionResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { useReportingCurrency } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { optimisticPagedRemoval, optimisticUpdate } from "@/lib/optimistic";
import { normalizeMoney } from "@/lib/validation";
import { optimisticId } from "../transaction-amount";

interface Options {
  listKey: QueryKey;
  onUpdated: () => void;
  onBulkApplied: () => void;
}

function optimisticTransaction(
  { data }: CreateTransactionMutationVariables,
  reportingCurrency: Currency,
): TransactionResponse {
  return {
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
}

export function useTransactionMutations({ listKey, onUpdated, onBulkApplied }: Readonly<Options>) {
  const { t } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  function withOptimisticTransaction(
    previous: PagedResponseOfTransactionResponse,
    variables: CreateTransactionMutationVariables,
  ) {
    return {
      ...previous,
      items: [optimisticTransaction(variables, reportingCurrency), ...previous.items],
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

  const create = useCreateTransaction({
    mutation: {
      meta: { silent: true, success: t("transactions.created") },
      ...optimisticCreate,
    },
  });

  const update = useUpdateTransaction(silent({ onSuccess: onUpdated }));

  const remove = useDeleteTransaction({ mutation: optimisticDelete });

  const bulkTag = useBulkTagTransactions({
    mutation: {
      onSuccess: (result) => {
        toast.success(t("tags.retagged", { count: result.updated }));
        onBulkApplied();
      },
    },
  });

  const bulkCategory = useBulkCategorizeTransactions({
    mutation: {
      onSuccess: (result) => {
        toast.success(t("transactions.recategorized", { count: result.updated }));
        onBulkApplied();
      },
    },
  });

  return { create, update, remove, bulkTag, bulkCategory };
}
