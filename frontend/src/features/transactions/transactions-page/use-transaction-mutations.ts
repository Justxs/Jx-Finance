import type { QueryKey } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type CreateTransactionMutationVariables,
  getLedgerQueryKey,
  useBulkCategorizeTransactions,
  useBulkTagTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
  useUploadAttachment,
} from "@/api/generated";
import type { PagedResponseOfLedgerItemResponse } from "@/api/generated/model";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { silentMutation } from "@/lib/mutations";
import { optimisticUpdate } from "@/lib/optimistic";
import { errorMessage } from "@/lib/query-client";
import {
  optimisticTransaction,
  withLedgerTransaction,
  withoutLedgerTransaction,
} from "./ledger-page";

interface Options {
  listKey: QueryKey;
  onBulkApplied: () => void;
}

export function useTransactionMutations({ listKey, onBulkApplied }: Readonly<Options>) {
  const { t } = useTranslation();
  const reportingCurrency = useReportingCurrency();

  function withOptimisticTransaction(
    previous: PagedResponseOfLedgerItemResponse,
    variables: CreateTransactionMutationVariables,
  ) {
    return withLedgerTransaction(previous, optimisticTransaction(variables, reportingCurrency));
  }

  const optimisticCreate = optimisticUpdate({
    queryKey: listKey,
    cancelKey: getLedgerQueryKey(),
    apply: withOptimisticTransaction,
  });

  const optimisticDelete = optimisticUpdate({
    queryKey: listKey,
    cancelKey: getLedgerQueryKey(),
    apply: withoutLedgerTransaction,
  });

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
