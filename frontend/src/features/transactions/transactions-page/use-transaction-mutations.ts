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
  useUploadAttachment,
} from "@/api/generated";
import type {
  Currency,
  PagedResponseOfTransactionResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { optimisticId } from "@/features/transactions/transaction-amount/transaction-row";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { silentMutation } from "@/lib/mutations";
import { optimisticPagedRemoval, optimisticUpdate } from "@/lib/optimistic";
import { errorMessage } from "@/lib/query-client";
import { spreadUntil } from "@/lib/spread-slices";
import { normalizeMoney } from "@/lib/validation";

interface Options {
  listKey: QueryKey;
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
    unusual: null,
    unusualDismissed: false,
    spreadMonths: data.spreadMonths,
    spreadUntil: data.spreadMonths ? spreadUntil(data.date, data.spreadMonths) : null,
    place: data.place,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

export function useTransactionMutations({ listKey, onBulkApplied }: Readonly<Options>) {
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

  const update = useUpdateTransaction({ mutation: silentMutation });

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

  const uploadReceipt = useUploadAttachment({ mutation: silentMutation });

  async function attachReceipt(transactionId: string, file: File) {
    try {
      await uploadReceipt.mutateAsync({ transactionId, data: { file } });
    } catch (error) {
      toast.error(t("receipts.attachFailed"), { description: errorMessage(error).description });
    }
  }

  return { create, update, remove, bulkTag, bulkCategory, attachReceipt };
}
