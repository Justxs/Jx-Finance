import type { QueryKey } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  type CreateTransactionMutationVariables,
  getLedgerQueryKey,
  useBulkCategorizeTransactions,
  useBulkDeleteTransactions,
  useBulkMoveTransactions,
  useBulkTagTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useRestoreTransactions,
  useUpdateTransaction,
  useUploadAttachment,
} from "@/api/generated";
import type {
  PagedResponseOfLedgerItemResponse,
  TransactionRefusalResponse,
} from "@/api/generated/model";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { silentMutation } from "@/lib/mutations";
import { optimisticUpdate } from "@/lib/optimistic";
import { errorMessage } from "@/lib/query-client";
import { refusalReasons } from "./bulk-refusals";
import {
  optimisticTransaction,
  withLedgerTransaction,
  withoutLedgerTransaction,
} from "./ledger-page";

interface Options {
  listKey: QueryKey;
  accountNames: ReadonlyMap<string | undefined, string | undefined>;
  onBulkApplied: () => void;
}

function showOutcome(refused: readonly TransactionRefusalResponse[], done: string, partly: string) {
  if (refused.length === 0) {
    toast.success(done);
    return;
  }
  toast.warning(partly, { description: refusalReasons(refused) });
}

export function useTransactionMutations({
  listKey,
  accountNames,
  onBulkApplied,
}: Readonly<Options>) {
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

  const bulkMove = useBulkMoveTransactions({
    mutation: {
      onSuccess: (result, { data }) => {
        const count = data.transactionIds.length;
        const moved = count - result.refused.length;
        const account = accountNames.get(data.accountId) ?? "";
        showOutcome(
          result.refused,
          t("transactions.moved", { count, account }),
          t("transactions.movedPartly", { count, moved, account }),
        );
        onBulkApplied();
      },
    },
  });

  const restoreSelection = useRestoreTransactions({
    mutation: {
      onSuccess: (result, { data }) => {
        const count = data.transactionIds.length;
        showOutcome(
          result.refused,
          t("transactions.bulkRestored", { count }),
          t("transactions.bulkRestoredPartly", { count, restored: result.restored }),
        );
      },
    },
  });

  const bulkDelete = useBulkDeleteTransactions({
    mutation: {
      onSuccess: (result, { data }) => {
        toast.success(t("transactions.bulkDeleted", { count: result.deleted }), {
          action: {
            label: t("trash.undo"),
            onClick: () =>
              restoreSelection.mutate({ data: { transactionIds: data.transactionIds } }),
          },
        });
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

  return { create, update, remove, bulkTag, bulkCategory, bulkMove, bulkDelete, attachReceipt };
}
